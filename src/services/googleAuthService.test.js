import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getTokenExpiresAt,
  GoogleAuthorizationRequiredError,
  hasAllScopes,
  parseGrantedScopes,
  requestGoogleAccessToken,
} from './googleAuthService';

describe('googleAuthService', () => {
  afterEach(() => {
    delete globalThis.google;
  });

  it('parses the scopes actually returned by Google', () => {
    expect([...parseGrantedScopes({ scope: 'scope-a scope-b' })]).toEqual(['scope-a', 'scope-b']);
  });

  it('rejects partial grants when granular consent omits a requested scope', () => {
    expect(hasAllScopes({ scope: 'scope-a' }, ['scope-a', 'scope-b'], null)).toBe(false);
  });

  it('uses the token lifetime with an expiry safety window', () => {
    expect(getTokenExpiresAt({ expires_in: 3600 }, 1000)).toBe(1000 + (59 * 60 * 1000));
  });

  it('marks missing authorization with a typed error', () => {
    expect(new GoogleAuthorizationRequiredError()).toMatchObject({
      kind: 'authorization-required',
      name: 'GoogleAuthorizationRequiredError',
    });
  });

  it('surfaces popup cancellation as a typed authorization error', async () => {
    globalThis.google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((config) => ({
            requestAccessToken: () => config.error_callback({ type: 'popup_closed' }),
          })),
        },
      },
    };

    await expect(requestGoogleAccessToken({
      clientId: 'client-id',
      scopes: ['scope-a'],
    })).rejects.toMatchObject({ kind: 'popup-closed' });
  });

  it('rejects a token response that omits requested granular scopes', async () => {
    globalThis.google = {
      accounts: {
        oauth2: {
          hasGrantedAllScopes: vi.fn(() => false),
          initTokenClient: vi.fn((config) => ({
            requestAccessToken: () => config.callback({
              access_token: 'token',
              expires_in: 3600,
              scope: 'scope-a',
            }),
          })),
        },
      },
    };

    await expect(requestGoogleAccessToken({
      clientId: 'client-id',
      scopes: ['scope-a', 'scope-b'],
    })).rejects.toMatchObject({ kind: 'scope-denied' });
  });
});
