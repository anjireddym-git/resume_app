import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, GMAIL_SEND_SCOPE, GMAIL_READONLY_SCOPE, GOOGLE_DRIVE_SCOPES } from '../lib/firebase';
import { analyticsService } from '../services/analyticsService';

const AuthContext = createContext(null);

// In-memory only — never persist Google OAuth access tokens to localStorage.
// We DO cache to sessionStorage (cleared on tab close) so reloads within the
// same browser session skip the re-auth popup.
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // tokens last ~1h, refresh at 55min

// ---- sessionStorage helpers for the Google OAuth access token ----
const _sessionTokenKey = (uid) => `gat_session_${uid}`;

const _readSessionToken = (uid) => {
  try {
    const raw = sessionStorage.getItem(_sessionTokenKey(uid));
    if (!raw) return null;
    const { token, issuedAt, scopes } = JSON.parse(raw);
    if (!token || !issuedAt) return null;
    if (Date.now() - issuedAt > TOKEN_LIFETIME_MS) {
      sessionStorage.removeItem(_sessionTokenKey(uid));
      return null;
    }
    return { token, issuedAt, scopes: new Set(scopes || []) };
  } catch { return null; }
};

const _writeSessionToken = (uid, token, issuedAt, scopes) => {
  try {
    sessionStorage.setItem(_sessionTokenKey(uid), JSON.stringify({
      token, issuedAt, scopes: [...scopes],
    }));
  } catch {}
};

const _clearSessionToken = (uid) => {
  try { sessionStorage.removeItem(_sessionTokenKey(uid)); } catch {}
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Google OAuth access token for Drive/Docs APIs. Kept only in memory.
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [driveAuthState, setDriveAuthState] = useState('unknown'); // unknown|connecting|granted|denied|error
  const [driveAuthError, setDriveAuthError] = useState(null);
  // Track which extra OAuth scopes the current access token carries.
  // Updated whenever we (re)acquire a token through signInWithPopup so the
  // UI can lazily request Gmail access without disrupting the base sign-in.
  const [grantedScopes, setGrantedScopes] = useState(new Set());
  const tokenIssuedAtRef = useRef(null);

  // localStorage key for remembering that the user has granted Drive scopes.
  // We use this on reload to know whether to silently re-acquire the token.
  const driveGrantedKey = (uid) => `drive_granted_${uid}`;
  // Persist which Gmail scopes a user previously granted so we know whether
  // to silently re-acquire them on reload.
  const gmailGrantedKey = (uid) => `gmail_granted_${uid}`;

  const persistDriveGranted = (uid) => {
    try { localStorage.setItem(driveGrantedKey(uid), '1'); } catch {}
  };
  const wasDriveGranted = (uid) => {
    try { return localStorage.getItem(driveGrantedKey(uid)) === '1'; } catch { return false; }
  };
  const clearDriveGranted = (uid) => {
    try { localStorage.removeItem(driveGrantedKey(uid)); } catch {}
  };

  // Persisted set of extra Google OAuth scopes (e.g. gmail.send) the user
  // has previously granted. We only use it as a hint to silently re-request
  // those scopes after a reload — the source of truth is the OAuth server.
  const readGmailGrantedSet = (uid) => {
    try {
      const raw = localStorage.getItem(gmailGrantedKey(uid));
      if (!raw) return new Set();
      return new Set(JSON.parse(raw));
    } catch { return new Set(); }
  };
  const writeGmailGrantedSet = (uid, set) => {
    try {
      localStorage.setItem(gmailGrantedKey(uid), JSON.stringify([...set]));
    } catch {}
  };
  const clearGmailGranted = (uid) => {
    try { localStorage.removeItem(gmailGrantedKey(uid)); } catch {}
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Create/update user document in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          lastLoginAt: serverTimestamp(),
        };

        if (!userSnap.exists()) {
          // New user
          await setDoc(userRef, {
            ...userData,
            createdAt: serverTimestamp(),
            preferences: {
              currentGroupId: null,
              currentResumeId: null,
            }
          });
        } else {
          // Existing user - update last login
          await setDoc(userRef, userData, { merge: true });
        }

        setUser({
          ...userData,
          preferences: userSnap.exists() ? userSnap.data().preferences : {}
        });

        // Restore cached access token from sessionStorage so the user
        // doesn't get a re-auth popup on every page reload.
        const cached = _readSessionToken(firebaseUser.uid);
        if (cached) {
          setGoogleAccessToken(cached.token);
          tokenIssuedAtRef.current = cached.issuedAt;
          setGrantedScopes(cached.scopes);
          setDriveAuthState('granted');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Capture OAuth credential for Drive/Docs API calls
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const issuedAt = Date.now();
        const scopes = new Set(GOOGLE_DRIVE_SCOPES);
        setGoogleAccessToken(credential.accessToken);
        tokenIssuedAtRef.current = issuedAt;
        setDriveAuthState('granted');
        if (result.user?.uid) {
          persistDriveGranted(result.user.uid);
          _writeSessionToken(result.user.uid, credential.accessToken, issuedAt, scopes);
        }
        // Base sign-in only carries drive.file + documents; reset extra scopes
        // tracking — the user will need to re-grant Gmail next time they use it.
        setGrantedScopes(scopes);
      }
      // Track login event
      analyticsService.trackLogin('google');
      analyticsService.initSession(result.user.uid, {
        email_domain: result.user.email?.split('@')[1] || 'unknown',
      });
      return result.user;
    } catch (error) {
      console.error('Sign in error:', error);
      analyticsService.trackAPIError('auth/signin', error.code, error.message);
      throw error;
    }
  };

  /**
   * Re-prompt the user to grant Drive permissions and refresh the access token.
   * Used when the token expires or when Drive permissions were revoked.
   */
  const reconnectGoogleDrive = useCallback(async () => {
    setDriveAuthState('connecting');
    setDriveAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const issuedAt = Date.now();
        const scopes = new Set(GOOGLE_DRIVE_SCOPES);
        setGoogleAccessToken(credential.accessToken);
        tokenIssuedAtRef.current = issuedAt;
        setDriveAuthState('granted');
        if (result.user?.uid) {
          persistDriveGranted(result.user.uid);
          _writeSessionToken(result.user.uid, credential.accessToken, issuedAt, scopes);
        }
        // Re-auth via the base provider drops any previously requested
        // extra scopes from the new token. Reset our tracking accordingly.
        setGrantedScopes(scopes);
        return credential.accessToken;
      }
      setDriveAuthState('denied');
      throw new Error('Google access token was not returned. Please grant Drive permission.');
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('popup-closed') || code.includes('cancelled')) {
        setDriveAuthState('denied');
        setDriveAuthError('Drive access is required to use the app. Please complete the popup.');
      } else if (code.includes('popup-blocked')) {
        setDriveAuthState('error');
        setDriveAuthError('Browser blocked the popup. Allow popups for this site and try again.');
      } else {
        setDriveAuthState('error');
        setDriveAuthError(err?.message || 'Could not connect to Google Drive.');
      }
      throw err;
    }
  }, []);

  /**
   * Returns a valid Google access token, re-authenticating silently if expired.
   */
  const getGoogleAccessToken = useCallback(async () => {
    const issued = tokenIssuedAtRef.current;
    const expired = !issued || Date.now() - issued > TOKEN_LIFETIME_MS;
    if (googleAccessToken && !expired) return googleAccessToken;
    return reconnectGoogleDrive();
  }, [googleAccessToken, reconnectGoogleDrive]);

  /**
   * Lazily acquire an OAuth access token that carries the requested extra
   * Google scopes (in addition to the existing Drive/Docs scopes). Used by
   * the Tailor-and-Send flow to request gmail.send / gmail.readonly only
   * when the user actually opts in to the email features.
   *
   * Returns the new access token. Always re-prompts via signInWithPopup so
   * the consent screen is shown for newly added scopes.
   */
  const requestAdditionalGoogleScopes = useCallback(async (extraScopes = []) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'consent',          // force consent screen for incremental scopes
      include_granted_scopes: 'true',
      login_hint: user?.email || undefined,
    });
    // Always re-request the base Drive/Docs scopes so the new token can still
    // be used for Drive operations after this re-auth.
    [...GOOGLE_DRIVE_SCOPES, ...extraScopes].forEach((s) => provider.addScope(s));

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google did not return an access token. Please try again.');
    }
    const issuedAt = Date.now();
    const next = new Set([...GOOGLE_DRIVE_SCOPES, ...extraScopes]);
    setGoogleAccessToken(credential.accessToken);
    tokenIssuedAtRef.current = issuedAt;
    setGrantedScopes(next);
    if (result.user?.uid) {
      const persisted = readGmailGrantedSet(result.user.uid);
      extraScopes.forEach((s) => persisted.add(s));
      writeGmailGrantedSet(result.user.uid, persisted);
      persistDriveGranted(result.user.uid);
      _writeSessionToken(result.user.uid, credential.accessToken, issuedAt, next);
    }
    return credential.accessToken;
  }, [user?.email]);

  const hasScope = useCallback(
    (scope) => grantedScopes.has(scope),
    [grantedScopes]
  );

  /**
   * Convenience helper: ensure the in-memory access token carries gmail.send
   * (and optionally gmail.readonly when reply tracking is enabled). If the
   * scope is missing, prompts the user via signInWithPopup. Returns the
   * valid access token.
   */
  const ensureGmailAccess = useCallback(async ({ withReadonly = false } = {}) => {
    const needed = [GMAIL_SEND_SCOPE];
    if (withReadonly) needed.push(GMAIL_READONLY_SCOPE);
    const missing = needed.filter((s) => !grantedScopes.has(s));
    const issued = tokenIssuedAtRef.current;
    const expired = !issued || Date.now() - issued > TOKEN_LIFETIME_MS;
    if (!missing.length && googleAccessToken && !expired) {
      return googleAccessToken;
    }
    return requestAdditionalGoogleScopes(needed);
  }, [grantedScopes, googleAccessToken, requestAdditionalGoogleScopes]);

  const signOut = async () => {
    try {
      // Track logout before signing out
      analyticsService.trackLogout();
      analyticsService.clearUser();
      if (user?.uid) {
        clearDriveGranted(user.uid);
        clearGmailGranted(user.uid);
        _clearSessionToken(user.uid);
      }
      setGoogleAccessToken(null);
      tokenIssuedAtRef.current = null;
      setDriveAuthState('unknown');
      setDriveAuthError(null);
      setGrantedScopes(new Set());
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updatePreferences = async (preferences) => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { preferences }, { merge: true });
    setUser(prev => ({ ...prev, preferences: { ...prev.preferences, ...preferences } }));
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    updatePreferences,
    isAuthenticated: !!user,
    // Google Drive integration
    googleAccessToken,
    getGoogleAccessToken,
    reconnectGoogleDrive,
    hasGoogleDriveAccess: !!googleAccessToken,
    driveAuthState,
    driveAuthError,
    wasDriveGrantedBefore: user?.uid ? wasDriveGranted(user.uid) : false,
    // Gmail integration (lazy / incremental consent)
    hasGmailSendScope: grantedScopes.has(GMAIL_SEND_SCOPE),
    hasGmailReadScope: grantedScopes.has(GMAIL_READONLY_SCOPE),
    hasScope,
    ensureGmailAccess,
    requestAdditionalGoogleScopes,
    wasGmailSendGrantedBefore: user?.uid ? readGmailGrantedSet(user.uid).has(GMAIL_SEND_SCOPE) : false,
    wasGmailReadGrantedBefore: user?.uid ? readGmailGrantedSet(user.uid).has(GMAIL_READONLY_SCOPE) : false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
