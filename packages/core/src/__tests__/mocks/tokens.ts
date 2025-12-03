import { vi } from 'vitest';

/**
 * Creates a mock OAuth token response for testing
 * @param overrides Optional properties to override the default values
 */
export const createMockTokenResponse = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  access_token: 'access-token-123',
  expires_in: 3600,
  id_token:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJwcm9maWxlX3BpY3R1cmUiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGcifQ.invalid-signature',
  refresh_token: 'refresh-token-456',
  scope: 'bibles highlights openid',
  token_type: 'Bearer',
  ...overrides,
});

/**
 * Creates a mock fetch response for testing
 * @param data The response data
 * @param options Optional properties to override the default response
 */
export const createMockFetchResponse = (
  data: unknown,
  options: Record<string, unknown> = {},
): Record<string, unknown> => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  clone: vi.fn(() => ({
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  })),
  ...options,
});

/**
 * Creates a mock error fetch response for testing
 * @param status The HTTP status code
 * @param statusText The HTTP status text
 */
export const createMockErrorFetchResponse = (
  status: number,
  statusText: string,
): Record<string, unknown> => ({
  ok: false,
  status,
  statusText,
  json: vi.fn().mockRejectedValue(new Error('Response not JSON')),
  text: vi.fn().mockResolvedValue(''),
});

/**
 * Creates a mock refresh token response for testing
 * @param overrides Optional properties to override the default values
 */
export const createMockRefreshTokenResponse = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  access_token: 'new-access-token',
  expires_in: 3600,
  refresh_token: 'new-refresh-token',
  scope: 'bibles highlights openid',
  token_type: 'Bearer',
  ...overrides,
});
