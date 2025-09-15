// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WorkstreamEscrow} from "../src/WorkstreamEscrow.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDCMock is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract WorkstreamEscrowTest is Test {
    WorkstreamEscrow escrow;
    USDCMock usdc;

    address owner;
    address arb;
    address client;
    address worker;

    function setUp() public {
        owner  = makeAddr("owner");
        arb    = makeAddr("arbitrator");
        client = makeAddr("client");
        worker = makeAddr("worker");
        vm.prank(owner);
        escrow = new WorkstreamEscrow(owner, arb);
        usdc = new USDCMock();
        usdc.mint(client, 1_000_000_000);
    }

    function _setupJob() internal returns (uint256 id) {
        vm.prank(client);
        id = escrow.createJob(worker, address(usdc), keccak256("job"));
        WorkstreamEscrow.Milestone[] memory m = new WorkstreamEscrow.Milestone[](2);
        m[0] = WorkstreamEscrow.Milestone({
            amount: 300_000000,
            deliverableHash: bytes32(0),
            delivered: false,
            released: false,
            disputed: false
        });
        m[1] = WorkstreamEscrow.Milestone({
            amount: 200_000000,
            deliverableHash: bytes32(0),
            delivered: false,
            released: false,
            disputed: false
        });
        vm.prank(client);
        escrow.setMilestones(id, m);
        return id;
    }

    function test_happy_release_and_dispute() public {
        uint256 id = _setupJob();
        vm.startPrank(client);
        usdc.approve(address(escrow), 600_000000);
        escrow.fund(id, 600_000000);
        vm.stopPrank();
        vm.prank(worker);
        escrow.deliver(id, 0, keccak256("cid0"));
        uint256 w0 = usdc.balanceOf(worker);
        vm.prank(client);
        escrow.release(id, 0);
        assertEq(usdc.balanceOf(worker) - w0, 300_000000);
        vm.prank(client);
        escrow.openDispute(id, 1, keccak256("reason"));
        uint256 c0 = usdc.balanceOf(client);
        uint256 w1 = usdc.balanceOf(worker);
        vm.prank(arb);
        escrow.resolve(id, 1, 6000);
        assertEq(usdc.balanceOf(client) - c0, 120_000000);
        assertEq(usdc.balanceOf(worker) - w1, 80_000000);
    }

    function test_release_requires_delivery() public {
        uint256 id = _setupJob();
        vm.startPrank(client);
        usdc.approve(address(escrow), 300_000000);
        escrow.fund(id, 300_000000);
        vm.stopPrank();
        vm.prank(client);
        vm.expectRevert(WorkstreamEscrow.NotDelivered.selector);
        escrow.release(id, 0);
    }

    function test_refund_remainder_overfund_only_excess_is_refunded() public {
        uint256 id = _setupJob();
        vm.startPrank(client);
        usdc.approve(address(escrow), 700_000000);
        escrow.fund(id, 700_000000);
        vm.stopPrank();
        uint256 c0 = usdc.balanceOf(client);
        vm.prank(client);
        escrow.refundRemainder(id);
        assertEq(usdc.balanceOf(client) - c0, 200_000000);
    }

    function test_refund_remainder_after_release_keeps_locked_amount() public {
        uint256 id = _setupJob();
        vm.startPrank(client);
        usdc.approve(address(escrow), 700_000000);
        escrow.fund(id, 700_000000);
        vm.stopPrank();
        vm.prank(worker);
        escrow.deliver(id, 0, keccak256("cid0"));
        vm.prank(client);
        escrow.release(id, 0);
        uint256 c0 = usdc.balanceOf(client);
        vm.prank(client);
        escrow.refundRemainder(id);
        assertEq(usdc.balanceOf(client) - c0, 200_000000);
    }
}
