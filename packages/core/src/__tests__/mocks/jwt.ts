import { vi } from 'vitest';

/**
 * Creates a mock JWT token for testing
 * @param payload The JWT payload to encode
 * @returns A mock JWT string with the format header.payload.signature
 */
export const createMockJWT = (payload: Record<string, unknown>): string => {
  // Use a simple encoding for testing (not real base64)
  const header = 'mockHeader';
  const body = JSON.stringify(payload);
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
};

/**
 * Creates a realistic-looking JWT token with proper base64url encoding
 * @param payload The JWT payload
 * @returns A properly formatted JWT token
 */
export const createRealisticJWT = (payload: Record<string, unknown>): string => {
  const header = { alg: 'HS256', typ: 'JWT' };

  // Simple base64url encoding for testing
  const base64urlEncode = (str: string) => {
    if (typeof btoa !== 'undefined') {
      return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    }
    // Fallback for test environment
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const headerEncoded = base64urlEncode(JSON.stringify(header));
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const signature = 'invalid-signature'; // Mock signature

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
};

/**
 * Sets up JWT-related mocks for atob/btoa functions
 * @param payload The expected JWT payload to decode
 */
export const setupJWTMocks = (
  payload: Record<string, unknown> = {},
): { atob: ReturnType<typeof vi.fn>; btoa: ReturnType<typeof vi.fn> } => {
  const atobMock = vi.fn((str: string) => {
    // Handle base64 padding
    let padded = str;
    while (padded.length % 4 !== 0) {
      padded += '=';
    }

    // For testing, just return the payload
    if (str.includes('eyJ')) {
      // Looks like a real base64 JWT part
      return JSON.stringify(payload);
    }

    return str;
  });

  const btoaMock = vi.fn((str: string) => {
    // Simple base64 encoding for testing
    return `base64_${str.length}`;
  });

  vi.stubGlobal('atob', atobMock);
  vi.stubGlobal('btoa', btoaMock);

  return { atob: atobMock, btoa: btoaMock };
};

/**
 * Creates a mock JWT with standard claims
 * @param overrides Optional claim overrides
 */
export const createMockJWTWithClaims = (overrides: Record<string, unknown> = {}): string => {
  const defaultClaims = {
    sub: '1234567890',
    name: 'John Doe',
    email: 'john@example.com',
    profile_picture: 'https://example.com/avatar.jpg',
    iat: 1516239022,
    exp: 1516242622,
  };

  return createRealisticJWT({ ...defaultClaims, ...overrides });
};
