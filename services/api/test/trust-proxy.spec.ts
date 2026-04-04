import { readTrustProxyValue } from '../src/common/http/trust-proxy';

describe('readTrustProxyValue', () => {
  it('returns undefined for missing values', () => {
    expect(readTrustProxyValue(undefined)).toBeUndefined();
    expect(readTrustProxyValue('   ')).toBeUndefined();
  });

  it('parses boolean values', () => {
    expect(readTrustProxyValue('true')).toBe(true);
    expect(readTrustProxyValue('false')).toBe(false);
  });

  it('parses positive integer hop counts', () => {
    expect(readTrustProxyValue('0')).toBe(0);
    expect(readTrustProxyValue('2')).toBe(2);
  });

  it('keeps named proxy presets as strings', () => {
    expect(readTrustProxyValue('loopback')).toBe('loopback');
    expect(readTrustProxyValue('10.0.0.0/8')).toBe('10.0.0.0/8');
  });
});
