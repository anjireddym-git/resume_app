const GIS_SCRIPT_ID = 'google-identity-services';
const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const TOKEN_EXPIRY_SKEW_MS = 60 * 1000;

let gisLoadPromise = null;

export class GoogleAuthorizationRequiredError extends Error {
  constructor(message = 'Google authorization is required.') {
    super(message);
    this.name = 'GoogleAuthorizationRequiredError';
    this.kind = 'authorization-required';
  }
}

export class GoogleAuthorizationError extends Error {
  constructor(message, kind = 'request-failed') {
    super(message);
    this.name = 'GoogleAuthorizationError';
    this.kind = kind;
  }
}

export function parseGrantedScopes(tokenResponse) {
  return new Set(String(tokenResponse?.scope || '').split(/\s+/).filter(Boolean));
}

export function getTokenExpiresAt(tokenResponse, now = Date.now()) {
  const expiresInMs = Number(tokenResponse?.expires_in || 0) * 1000;
  return now + Math.max(0, expiresInMs - TOKEN_EXPIRY_SKEW_MS);
}

export function hasAllScopes(tokenResponse, scopes, oauth2 = globalThis.google?.accounts?.oauth2) {
  if (oauth2?.hasGrantedAllScopes) {
    return oauth2.hasGrantedAllScopes(tokenResponse, ...scopes);
  }
  const granted = parseGrantedScopes(tokenResponse);
  return scopes.every((scope) => granted.has(scope));
}

export function loadGoogleIdentityServices() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve(globalThis.google.accounts.oauth2);
  if (gisLoadPromise) return gisLoadPromise;
  if (typeof document === 'undefined') {
    return Promise.reject(new GoogleAuthorizationError('Google authorization is only available in a browser.'));
  }

  gisLoadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (globalThis.google?.accounts?.oauth2) {
        resolve(globalThis.google.accounts.oauth2);
      } else {
        reject(new GoogleAuthorizationError('Google Identity Services did not load. Check your network connection.'));
      }
    };

    const existing = document.getElementById(GIS_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener('error', () => reject(new GoogleAuthorizationError('Could not load Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new GoogleAuthorizationError('Could not load Google Identity Services.')), { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    gisLoadPromise = null;
    throw error;
  });

  return gisLoadPromise;
}

export async function requestGoogleAccessToken({
  clientId,
  scopes,
  loginHint,
  prompt = 'consent',
}) {
  if (!clientId) {
    throw new GoogleAuthorizationError('Google OAuth client ID is not configured. Add VITE_GOOGLE_OAUTH_CLIENT_ID.');
  }
  if (!scopes?.length) {
    throw new GoogleAuthorizationError('At least one Google OAuth scope is required.');
  }

  const oauth2 = await loadGoogleIdentityServices();
  return new Promise((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      include_granted_scopes: true,
      login_hint: loginHint || undefined,
      prompt,
      callback: (response) => {
        if (response?.error) {
          reject(new GoogleAuthorizationError(response.error_description || response.error, response.error));
          return;
        }
        if (!response?.access_token) {
          reject(new GoogleAuthorizationError('Google did not return an access token.'));
          return;
        }
        if (!hasAllScopes(response, scopes, oauth2)) {
          reject(new GoogleAuthorizationError('The requested Google permissions were not granted.', 'scope-denied'));
          return;
        }
        resolve({
          token: response.access_token,
          expiresAt: getTokenExpiresAt(response),
          scopes: parseGrantedScopes(response),
        });
      },
      error_callback: (response) => {
        const kind = response?.type === 'popup_closed' ? 'popup-closed' : 'popup-blocked';
        const message = response?.type === 'popup_closed'
          ? 'Google authorization was cancelled.'
          : 'Google authorization popup could not open. Allow popups and try again.';
        reject(new GoogleAuthorizationError(message, kind));
      },
    });

    tokenClient.requestAccessToken();
  });
}
