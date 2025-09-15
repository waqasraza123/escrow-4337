// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract WorkstreamEscrow is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct Job {
        address client;
        address worker;
        address currency;
        uint256 total;
        uint256 funded;
        bool active;
        bytes32 jobHash;
        uint64 createdAt;
    }

    struct Milestone {
        uint256 amount;
        bytes32 deliverableHash;
        bool delivered;
        bool released;
        bool disputed;
    }

    uint256 public nextEscrowId;
    address public arbitrator;

    mapping(uint256 => Job) public jobs;
    mapping(uint256 => mapping(uint256 => Milestone)) public milestones;
    mapping(uint256 => uint256) public milestoneCount;
    mapping(uint256 => uint256) public releasedAmount;
    mapping(uint256 => uint256) public disputedLocked;

    event JobCreated(uint256 indexed escrowId, address indexed client, bytes32 jobHash);
    event EscrowFunded(uint256 indexed escrowId, uint256 amount, address currency);
    event MilestonesSet(uint256 indexed escrowId, uint256 count);
    event MilestoneDelivered(uint256 indexed escrowId, uint256 indexed mid, bytes32 deliverableHash);
    event MilestoneReleased(uint256 indexed escrowId, uint256 indexed mid, uint256 amount);
    event DisputeOpened(uint256 indexed escrowId, uint256 indexed mid, bytes32 reasonHash);
    event DisputeResolved(uint256 indexed escrowId, uint256 indexed mid, uint16 splitBpsClient);
    event ArbitratorChanged(address indexed prev, address indexed next);

    error NotClient();
    error NotWorker();
    error NotArbitrator();
    error NotActive();
    error AlreadyDelivered();
    error NotDelivered();
    error AlreadyReleased();
    error AlreadyDisputed();
    error MilestonesAlreadySet();
    error InvalidMilestone();
    error UnderFunded();
    error NothingToRefund();

    modifier onlyClient(uint256 id){ if (msg.sender != jobs[id].client) revert NotClient(); _; }
    modifier onlyWorker(uint256 id){ if (msg.sender != jobs[id].worker) revert NotWorker(); _; }
    modifier onlyArb(){ if (msg.sender != arbitrator) revert NotArbitrator(); _; }

    constructor(address initialOwner, address initialArbitrator) Ownable(initialOwner) {
        arbitrator = initialArbitrator;
    }

    function setArbitrator(address next) external onlyOwner {
        emit ArbitratorChanged(arbitrator, next);
        arbitrator = next;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function createJob(address worker, address currency, bytes32 jobHash)
        external whenNotPaused returns (uint256 id)
    {
        require(worker != address(0) && currency != address(0), "zero addr");
        id = ++nextEscrowId;
        Job storage j = jobs[id];
        j.client = msg.sender;
        j.worker = worker;
        j.currency = currency;
        j.active = true;
        j.jobHash = jobHash;
        j.createdAt = uint64(block.timestamp);
        emit JobCreated(id, msg.sender, jobHash);
    }

    function fund(uint256 id, uint256 amount)
        external nonReentrant onlyClient(id) whenNotPaused
    {
        Job storage j = jobs[id];
        if (!j.active) revert NotActive();
        IERC20(j.currency).safeTransferFrom(msg.sender, address(this), amount);
        j.funded += amount;
        emit EscrowFunded(id, amount, j.currency);
    }

    function setMilestones(uint256 id, Milestone[] calldata m)
        external onlyClient(id) whenNotPaused
    {
        if (milestoneCount[id] != 0) revert MilestonesAlreadySet();
        require(m.length > 0, "no milestones");
        uint256 total;
        for (uint256 i; i < m.length; i++) {
            require(m[i].amount > 0, "zero amount");
            milestones[id][i] = Milestone({
                amount: m[i].amount,
                deliverableHash: bytes32(0),
                delivered: false,
                released: false,
                disputed: false
            });
            total += m[i].amount;
        }
        milestoneCount[id] = m.length;
        jobs[id].total = total;
        emit MilestonesSet(id, m.length);
    }

    function deliver(uint256 id, uint256 mid, bytes32 deliverableHash)
        external onlyWorker(id) whenNotPaused
    {
        if (mid >= milestoneCount[id]) revert InvalidMilestone();
        Milestone storage ms = milestones[id][mid];
        if (ms.delivered) revert AlreadyDelivered();
        ms.deliverableHash = deliverableHash;
        ms.delivered = true;
        emit MilestoneDelivered(id, mid, deliverableHash);
    }

    function release(uint256 id, uint256 mid)
        external nonReentrant onlyClient(id) whenNotPaused
    {
        if (mid >= milestoneCount[id]) revert InvalidMilestone();
        Job storage j = jobs[id];
        Milestone storage ms = milestones[id][mid];
        if (!ms.delivered) revert NotDelivered();
        if (ms.released) revert AlreadyReleased();
        if (ms.disputed) revert AlreadyDisputed();
        uint256 amt = ms.amount;
        if (j.funded < disputedLocked[id] + amt) revert UnderFunded();
        ms.released = true;
        releasedAmount[id] += amt;
        j.funded -= amt;
        IERC20(j.currency).safeTransfer(j.worker, amt);
        emit MilestoneReleased(id, mid, amt);
    }

    function openDispute(uint256 id, uint256 mid, bytes32 reasonHash)
        external whenNotPaused
    {
        if (mid >= milestoneCount[id]) revert InvalidMilestone();
        Job storage j = jobs[id];
        require(msg.sender == j.client || msg.sender == j.worker, "parties only");
        Milestone storage ms = milestones[id][mid];
        if (ms.disputed) revert AlreadyDisputed();
        require(!ms.released, "already released");
        ms.disputed = true;
        disputedLocked[id] += ms.amount;
        emit DisputeOpened(id, mid, reasonHash);
    }

    function resolve(uint256 id, uint256 mid, uint16 splitBpsClient)
        external nonReentrant onlyArb whenNotPaused
    {
        if (mid >= milestoneCount[id]) revert InvalidMilestone();
        require(splitBpsClient <= 10_000, "bps");
        Job storage j = jobs[id];
        Milestone storage ms = milestones[id][mid];
        require(ms.disputed && !ms.released, "not disputable");
        uint256 amt = ms.amount;
        uint256 clientPart = (amt * splitBpsClient) / 10_000;
        uint256 workerPart = amt - clientPart;
        require(j.funded >= amt, "insufficient");
        disputedLocked[id] -= amt;
        ms.released = true;
        ms.disputed = false;
        releasedAmount[id] += amt;
        j.funded -= amt;
        if (workerPart > 0) IERC20(j.currency).safeTransfer(j.worker, workerPart);
        if (clientPart > 0) IERC20(j.currency).safeTransfer(j.client, clientPart);
        emit DisputeResolved(id, mid, splitBpsClient);
    }

    function refundRemainder(uint256 id)
        external nonReentrant onlyClient(id)
    {
        Job storage j = jobs[id];
        uint256 required = jobs[id].total - releasedAmount[id];
        if (j.funded <= required) revert NothingToRefund();
        uint256 remainder = j.funded - required;
        j.funded -= remainder;
        IERC20(j.currency).safeTransfer(j.client, remainder);
    }
}
