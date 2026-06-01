import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  GMAIL_READONLY_SCOPE,
  GMAIL_SEND_SCOPE,
  GOOGLE_DRIVE_SCOPE,
  googleProvider,
} from '../lib/firebase';
import { analyticsService } from '../services/analyticsService';
import {
  GoogleAuthorizationRequiredError,
  loadGoogleIdentityServices,
  requestGoogleAccessToken,
} from '../services/googleAuthService';

const AuthContext = createContext(null);
const GOOGLE_OAUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';
const EMPTY_SCOPES = new Set();

const sessionTokenKey = (uid) => `gat_session_${uid}`;
const gmailGrantedKey = (uid) => `gmail_granted_${uid}`;

function readSessionToken(uid) {
  try {
    const raw = sessionStorage.getItem(sessionTokenKey(uid));
    if (!raw) return null;
    const { token, expiresAt, scopes } = JSON.parse(raw);
    if (!token || !expiresAt || Date.now() >= expiresAt) {
      sessionStorage.removeItem(sessionTokenKey(uid));
      return null;
    }
    return { token, expiresAt, scopes: new Set(scopes || []) };
  } catch {
    return null;
  }
}

function writeSessionToken(uid, tokenState) {
  try {
    sessionStorage.setItem(sessionTokenKey(uid), JSON.stringify({
      token: tokenState.token,
      expiresAt: tokenState.expiresAt,
      scopes: [...tokenState.scopes],
    }));
  } catch {}
}

function clearSessionToken(uid) {
  try { sessionStorage.removeItem(sessionTokenKey(uid)); } catch {}
}

function readGmailGrantedSet(uid) {
  try {
    const raw = localStorage.getItem(gmailGrantedKey(uid));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeGmailGrantedSet(uid, scopes) {
  try {
    const gmailScopes = [...scopes].filter((scope) => (
      scope === GMAIL_SEND_SCOPE || scope === GMAIL_READONLY_SCOPE
    ));
    localStorage.setItem(gmailGrantedKey(uid), JSON.stringify(gmailScopes));
  } catch {}
}

function clearGmailGranted(uid) {
  try { localStorage.removeItem(gmailGrantedKey(uid)); } catch {}
}

function getAuthorizationErrorMessage(error, feature) {
  if (error?.kind === 'popup-closed') return `${feature} authorization was cancelled.`;
  if (error?.kind === 'popup-blocked') return 'Browser blocked the Google authorization popup. Allow popups and try again.';
  if (error?.kind === 'scope-denied') return `Please grant the requested ${feature} permission to continue.`;
  return error?.message || `Could not connect ${feature}.`;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [googleToken, setGoogleToken] = useState(null);
  const [driveAuthState, setDriveAuthState] = useState('unknown');
  const [driveAuthError, setDriveAuthError] = useState(null);

  const clearGoogleToken = useCallback((message = null) => {
    setGoogleToken(null);
    if (user?.uid) clearSessionToken(user.uid);
    if (message) {
      setDriveAuthState('denied');
      setDriveAuthError(message);
    } else {
      setDriveAuthState('unknown');
      setDriveAuthError(null);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadGoogleIdentityServices().catch(() => {
      // Authorization buttons surface configuration and loading errors on click.
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null);
          setGoogleToken(null);
          setDriveAuthState('unknown');
          return;
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        const initialPreferences = { currentGroupId: null, currentResumeId: null, driveSyncEnabled: false };
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          lastLoginAt: serverTimestamp(),
        };

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            ...userData,
            createdAt: serverTimestamp(),
            preferences: initialPreferences,
          });
        } else {
          await setDoc(userRef, userData, { merge: true });
        }

        setUser({
          ...userData,
          preferences: userSnap.exists() ? userSnap.data().preferences : initialPreferences,
        });

        setGoogleToken(null);
        setDriveAuthState('unknown');
        setDriveAuthError(null);
        const cached = readSessionToken(firebaseUser.uid);
        if (cached) {
          setGoogleToken(cached);
          if (cached.scopes.has(GOOGLE_DRIVE_SCOPE)) setDriveAuthState('granted');
        }
      } catch (error) {
        console.error('Failed to initialize authenticated user:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!googleToken?.expiresAt) return undefined;
    const delay = Math.max(0, googleToken.expiresAt - Date.now());
    const timer = setTimeout(() => {
      clearGoogleToken('Google authorization expired. Reconnect to resume Drive sync.');
    }, delay);
    return () => clearTimeout(timer);
  }, [clearGoogleToken, googleToken?.expiresAt]);

  const updatePreferences = useCallback(async (preferences) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { preferences }, { merge: true });
    setUser((previous) => ({
      ...previous,
      preferences: { ...previous.preferences, ...preferences },
    }));
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
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
  }, []);

  const requestScopes = useCallback(async (scopes, { prompt = 'consent', feature = 'Google' } = {}) => {
    try {
      const tokenState = await requestGoogleAccessToken({
        clientId: GOOGLE_OAUTH_CLIENT_ID,
        scopes,
        loginHint: user?.email,
        prompt,
      });
      setGoogleToken(tokenState);
      if (user?.uid) {
        writeSessionToken(user.uid, tokenState);
        writeGmailGrantedSet(user.uid, tokenState.scopes);
      }
      if (tokenState.scopes.has(GOOGLE_DRIVE_SCOPE)) {
        setDriveAuthState('granted');
        setDriveAuthError(null);
      }
      return tokenState.token;
    } catch (error) {
      if (feature === 'Google Drive') {
        setDriveAuthState(error?.kind === 'popup-closed' || error?.kind === 'scope-denied' ? 'denied' : 'error');
        setDriveAuthError(getAuthorizationErrorMessage(error, feature));
      }
      throw error;
    }
  }, [user?.email, user?.uid]);

  const connectGoogleDrive = useCallback(async ({ prompt = 'consent' } = {}) => {
    setDriveAuthState('connecting');
    setDriveAuthError(null);
    const token = await requestScopes([GOOGLE_DRIVE_SCOPE], { prompt, feature: 'Google Drive' });
    await updatePreferences({ driveSyncEnabled: true });
    return token;
  }, [requestScopes, updatePreferences]);

  const retryDriveSync = useCallback(
    () => connectGoogleDrive({ prompt: '' }),
    [connectGoogleDrive]
  );

  const disconnectGoogleDrive = useCallback(async () => {
    clearGoogleToken();
    await updatePreferences({ driveSyncEnabled: false });
  }, [clearGoogleToken, updatePreferences]);

  const getGoogleAccessToken = useCallback(async () => {
    if (
      googleToken?.token
      && googleToken.expiresAt > Date.now()
      && googleToken.scopes.has(GOOGLE_DRIVE_SCOPE)
    ) {
      return googleToken.token;
    }
    throw new GoogleAuthorizationRequiredError('Reconnect Google Drive to continue syncing.');
  }, [googleToken]);

  const ensureGmailAccess = useCallback(async ({ withReadonly = false } = {}) => {
    const needed = [GMAIL_SEND_SCOPE];
    if (withReadonly) needed.push(GMAIL_READONLY_SCOPE);
    if (
      googleToken?.token
      && googleToken.expiresAt > Date.now()
      && needed.every((scope) => googleToken.scopes.has(scope))
    ) {
      return googleToken.token;
    }
    return requestScopes(needed, { prompt: 'consent', feature: 'Gmail' });
  }, [googleToken, requestScopes]);

  const signOut = useCallback(async () => {
    try {
      analyticsService.trackLogout();
      analyticsService.clearUser();
      if (user?.uid) {
        clearSessionToken(user.uid);
        clearGmailGranted(user.uid);
      }
      setGoogleToken(null);
      setDriveAuthState('unknown');
      setDriveAuthError(null);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [user?.uid]);

  const grantedScopes = googleToken?.scopes || EMPTY_SCOPES;
  const hasGoogleDriveAccess = !!(
    googleToken?.token
    && googleToken.expiresAt > Date.now()
    && grantedScopes.has(GOOGLE_DRIVE_SCOPE)
  );
  const value = useMemo(() => ({
    user,
    loading,
    signInWithGoogle,
    signOut,
    updatePreferences,
    isAuthenticated: !!user,
    googleAccessToken: googleToken?.token || null,
    getGoogleAccessToken,
    connectGoogleDrive,
    reconnectGoogleDrive: retryDriveSync,
    retryDriveSync,
    disconnectGoogleDrive,
    invalidateGoogleAccessToken: clearGoogleToken,
    hasGoogleDriveAccess,
    driveSyncEnabled: user?.preferences?.driveSyncEnabled === true,
    driveAuthState,
    driveAuthError,
    hasGmailSendScope: grantedScopes.has(GMAIL_SEND_SCOPE),
    hasGmailReadScope: grantedScopes.has(GMAIL_READONLY_SCOPE),
    hasScope: (scope) => grantedScopes.has(scope),
    ensureGmailAccess,
    requestAdditionalGoogleScopes: (scopes) => requestScopes(scopes, { prompt: 'consent' }),
    wasGmailSendGrantedBefore: user?.uid ? readGmailGrantedSet(user.uid).has(GMAIL_SEND_SCOPE) : false,
    wasGmailReadGrantedBefore: user?.uid ? readGmailGrantedSet(user.uid).has(GMAIL_READONLY_SCOPE) : false,
  }), [
    clearGoogleToken,
    connectGoogleDrive,
    disconnectGoogleDrive,
    driveAuthError,
    driveAuthState,
    ensureGmailAccess,
    getGoogleAccessToken,
    googleToken?.token,
    grantedScopes,
    hasGoogleDriveAccess,
    loading,
    requestScopes,
    retryDriveSync,
    signInWithGoogle,
    signOut,
    updatePreferences,
    user,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
