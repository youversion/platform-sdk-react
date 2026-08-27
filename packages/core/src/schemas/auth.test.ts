import { expect, it } from 'vitest';
import { TokenExchangeResponseSchema, TokenRefreshResponseSchema } from './auth';

const exchangeFields = {
  access_token: 'access-token',
  id_token: 'id-token',
  refresh_token: 'refresh-token',
  scope: 'openid',
  token_type: 'Bearer',
};

it('accepts expires_in as a number or digit string and rejects other JSON values', () => {
  expect(
    TokenExchangeResponseSchema.parse({ ...exchangeFields, expires_in: 3600 }).expires_in,
  ).toBe(3600);
  expect(
    TokenExchangeResponseSchema.parse({ ...exchangeFields, expires_in: '3599' }).expires_in,
  ).toBe(3599);
  expect(
    TokenRefreshResponseSchema.parse({
      access_token: 'access-token',
      expires_in: '3599',
      refresh_token: 'refresh-token',
      scope: 'openid',
      token_type: 'Bearer',
    }).expires_in,
  ).toBe(3599);

  expect(
    TokenExchangeResponseSchema.safeParse({ ...exchangeFields, expires_in: null }).success,
  ).toBe(false);
  expect(
    TokenExchangeResponseSchema.safeParse({ ...exchangeFields, expires_in: false }).success,
  ).toBe(false);
  expect(TokenExchangeResponseSchema.safeParse({ ...exchangeFields, expires_in: '' }).success).toBe(
    false,
  );
  expect(
    TokenExchangeResponseSchema.safeParse({ ...exchangeFields, expires_in: ' ' }).success,
  ).toBe(false);
  expect(TokenExchangeResponseSchema.safeParse({ ...exchangeFields, expires_in: 0 }).success).toBe(
    false,
  );
  expect(
    TokenExchangeResponseSchema.safeParse({ ...exchangeFields, expires_in: '0' }).success,
  ).toBe(false);
  expect(TokenExchangeResponseSchema.safeParse({ ...exchangeFields, expires_in: -1 }).success).toBe(
    false,
  );
  expect(
    TokenExchangeResponseSchema.safeParse({ ...exchangeFields, expires_in: 1.5 }).success,
  ).toBe(false);
});
