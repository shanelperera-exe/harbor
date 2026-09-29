import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isTokenExpired, clearAuthSession } from './authSession';

/** Builds an unsigned JWT-shaped string with the given payload. */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('isTokenExpired', () => {
  it('returns true for a null token', () => {
    expect(isTokenExpired(null)).toBe(true);
  });

  it('returns true for an empty string token', () => {
    expect(isTokenExpired('')).toBe(true);
  });

  it('returns false for a token expiring in the future', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });

    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true for a token that expired in the past', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 3600 });

    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true for a token expiring exactly now', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) });

    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true when the token has no exp claim', () => {
    const token = makeToken({ sub: 'someone' });

    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true when exp is a string rather than a number', () => {
    const token = makeToken({ exp: String(Math.floor(Date.now() / 1000) + 3600) });

    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns true for a malformed token', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(true);
  });

  it('returns true for a token with no payload segment', () => {
    expect(isTokenExpired('headeronly.')).toBe(true);
  });

  it('returns true for a token whose payload is not valid JSON', () => {
    expect(isTokenExpired('header.bm90anNvbg.sig')).toBe(true);
  });

  it('decodes base64url payloads that use - and _ characters', () => {
    // A payload whose base64 encoding needs URL-safe substitutions.
    const payload = { exp: Math.floor(Date.now() / 1000) + 3600, data: '???>>>' };
    const token = makeToken(payload);

    // Sanity check that the encoding really did produce URL-safe characters.
    expect(token.split('.')[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(isTokenExpired(token)).toBe(false);
  });
});

describe('clearAuthSession', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('removes the token and user from localStorage', () => {
    localStorage.setItem('harbor_token', 'token-value');
    localStorage.setItem('harbor_user', 'user-value');

    clearAuthSession();

    expect(localStorage.getItem('harbor_token')).toBeNull();
    expect(localStorage.getItem('harbor_user')).toBeNull();
  });

  it('dispatches a storage event so open tabs can react', () => {
    const listener = vi.fn();
    window.addEventListener('storage', listener);

    clearAuthSession();

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('storage', listener);
  });

  it('does not throw when nothing is stored', () => {
    expect(() => clearAuthSession()).not.toThrow();
  });
});
