import { isCorsOriginAllowed, readCorsOrigins } from '../src/common/http/cors';

describe('cors helpers', () => {
  it('returns an empty allowlist when no origins are configured', () => {
    expect(readCorsOrigins(undefined)).toEqual([]);
    expect(readCorsOrigins('   ')).toEqual([]);
  });

  it('normalizes and deduplicates configured origins', () => {
    expect(
      readCorsOrigins(
        ' http://localhost:3000/ , http://localhost:3001, http://localhost:3000 ',
      ),
    ).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('rejects invalid origin values', () => {
    expect(() => readCorsOrigins('localhost:3000')).toThrow(
      'NEST_API_CORS_ORIGINS must contain comma-separated absolute origins.',
    );
  });

  it('allows same-process requests without an origin header', () => {
    expect(isCorsOriginAllowed(undefined, ['http://localhost:3000'])).toBe(
      true,
    );
  });

  it('matches normalized origins against the allowlist', () => {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

    expect(isCorsOriginAllowed('http://localhost:3000/', allowedOrigins)).toBe(
      true,
    );
    expect(isCorsOriginAllowed('http://localhost:3999', allowedOrigins)).toBe(
      false,
    );
  });
});
