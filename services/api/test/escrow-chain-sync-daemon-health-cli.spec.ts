import {
  parseArgs,
  shouldFailHealth,
} from '../src/modules/operations/escrow-chain-sync-daemon-health-cli';

describe('escrow-chain-sync-daemon-health-cli', () => {
  it('parses notify and fail-on flags', () => {
    expect(parseArgs(['--notify', '--fail-on', 'critical'])).toEqual({
      notify: true,
      dryRun: false,
      failOn: 'critical',
    });
    expect(parseArgs(['--dry-run', '--fail-on=never'])).toEqual({
      notify: false,
      dryRun: true,
      failOn: 'never',
    });
  });

  it('rejects invalid fail-on values', () => {
    expect(() => parseArgs(['--fail-on', 'broken'])).toThrow(
      '--fail-on must be one of warning, critical, or never',
    );
  });

  it('applies the requested failure threshold', () => {
    expect(
      shouldFailHealth({ status: 'warning' }, 'warning'),
    ).toBeTruthy();
    expect(
      shouldFailHealth({ status: 'warning' }, 'critical'),
    ).toBeFalsy();
    expect(shouldFailHealth({ status: 'failed' }, 'critical')).toBeTruthy();
    expect(shouldFailHealth({ status: 'failed' }, 'never')).toBeFalsy();
  });
});
