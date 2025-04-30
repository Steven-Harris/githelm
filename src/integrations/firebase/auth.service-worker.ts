// Firebase Authentication Service Worker
import { initializeApp } from 'firebase/app';
import { GithubAuthProvider, browserLocalPersistence, getAuth, setPersistence, signInWithPopup, signOut, 
  type User 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { AuthState, type AuthWorkerCommand, type AuthWorkerEvent } from './auth-worker-types';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAc2Q3c0Rd7jxT_Z7pq1urONyxIRidWDaQ",
  authDomain: "githelm.firebaseapp.com",
  projectId: "githelm",
  storageBucket: "githelm.appspot.com",
  messagingSenderId: "329298744372",
  appId: "1:329298744372:web:db5c6a79d68616c3d76661",
  measurementId: "G-7HWYDWLL6P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GithubAuthProvider();
provider.addScope("repo");

// Storage Functions
function getGithubToken(): string | undefined {
  try {
    return localStorage.getItem('github-token') || undefined;
  } catch {
    return undefined;
  }
}

function setGithubToken(token?: string): void {
  if (token) {
    try {
      localStorage.setItem('github-token', token);
    } catch (e) {
      console.error('Error saving token', e);
    }
  } else {
    try {
      localStorage.removeItem('github-token');
    } catch (e) {
      console.error('Error removing token', e);
    }
  }
}

function clearSiteData(): void {
  try {
    localStorage.clear();
  } catch (e) {
    console.error('Error clearing storage', e);
  }
}

// Auth state management
let authState: AuthState = 'initializing';
let user: User | null = null;
let authInProgress = false;
let refreshInterval: number | undefined;
const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

// Send message to main thread
function sendToMainThread(event: AuthWorkerEvent) {
  self.postMessage(event);
}

// Update authentication state
function setAuthState(state: AuthState) {
  authState = state;
  sendToMainThread({ type: 'AUTH_STATE_CHANGED', data: { state } });
}

// Update user info
function setUser(newUser: User | null) {
  user = newUser;
  
  if (newUser) {
    sendToMainThread({ 
      type: 'USER_CHANGED', 
      data: { 
        displayName: newUser.displayName, 
        email: newUser.email, 
        photoURL: newUser.photoURL 
      } 
    });
  } else {
    sendToMainThread({ 
      type: 'USER_CHANGED', 
      data: { 
        displayName: null, 
        email: null, 
        photoURL: null 
      } 
    });
  }
}

// Initialize authentication
async function initAuth() {
  setAuthState('initializing');
  
  try {
    await setPersistence(auth, browserLocalPersistence);
    
    auth.onAuthStateChanged(async (newUser: User | null) => {
      if (!newUser) {
        setAuthState('unauthenticated');
        setUser(null);
        return;
      }
      
      setUser(newUser);
      const tokenResult = await newUser.getIdTokenResult();
      
      if (new Date(tokenResult.expirationTime) < new Date()) {
        setAuthState('unauthenticated');
        await handleSignOut();
        return;
      }
      
      await startTokenRefresh(newUser);
      setAuthState('authenticated');
    });
  } catch (error) {
    console.error('Auth initialization error', error);
    setAuthState('error');
    sendToMainThread({ type: 'ERROR', data: { message: 'Failed to initialize authentication' } });
  }
}

// Validate GitHub token
async function validateGithubToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` }
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

// Start token refresh mechanism
async function startTokenRefresh(currentUser: User) {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = undefined;
  }
  
  const githubToken = getGithubToken();
  
  if (!githubToken) {
    setAuthState('authenticating');
    try {
      await refreshGithubToken();
    } catch (error) {
      setAuthState('error');
      await handleSignOut();
      return;
    }
  } 
  else {
    try {
      const isValid = await validateGithubToken(githubToken);
      if (!isValid) {
        setAuthState('authenticating');
        await handleReLogin();
        return;
      }
    } catch (error) {
      setAuthState('authenticating');
      await handleReLogin();
      return;
    }
  }

  setUser(currentUser);
  
  // Set up periodic token refresh
  refreshInterval = setInterval(refreshTokenPeriodically, REFRESH_INTERVAL);
}

// Periodically refresh token
async function refreshTokenPeriodically() {
  try {
    setAuthState('authenticating');
    await refreshGithubToken();
    setAuthState('authenticated');
  } catch (error) {
    setAuthState('error');
    await handleSignOut();
  }
}

// Refresh GitHub token
async function refreshGithubToken() {
  if (authInProgress) {
    return;
  }
  
  authInProgress = true;
  
  if (!user) {
    authInProgress = false;
    throw new Error('User is not authenticated');
  }
  
  try {
    await handleReLogin();
  } catch (error) {
    throw error;
  } finally {
    authInProgress = false;
  }
}

// Handle sign in request
async function handleSignIn() {
  if (authInProgress) {
    return;
  }
  
  authInProgress = true;
  setAuthState('authenticating');
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    
    if (credential?.accessToken) {
      setGithubToken(credential.accessToken);
      setAuthState('authenticated');
      return;
    }
    
    if (!result.user) {
      console.error('No credential or user returned from auth');
      setAuthState('error');
      sendToMainThread({ type: 'ERROR', data: { message: 'Authentication failed' } });
      return;
    }
    
    const additionalUserInfo = (result as any)._tokenResponse;
    if (!additionalUserInfo?.oauthAccessToken) {
      console.error('No GitHub token found in auth response');
      setAuthState('error');
      sendToMainThread({ type: 'ERROR', data: { message: 'Missing GitHub token' } });
      return;
    }
    
    setGithubToken(additionalUserInfo.oauthAccessToken);
    setAuthState('authenticated');
  } catch (error) {
    console.error('Error signing in:', error);
    setAuthState('error');
    sendToMainThread({ type: 'ERROR', data: { message: 'Sign-in failed' } });
  } finally {
    authInProgress = false;
  }
}

// Handle re-login request
async function handleReLogin() {
  if (authInProgress) {
    return;
  }
  
  authInProgress = true;
  setAuthState('authenticating');
  
  try {
    await signOut(auth);
    setGithubToken(undefined);
    await handleSignIn();
  } catch (error) {
    console.error('Error during relogin:', error);
    setAuthState('error');
    sendToMainThread({ type: 'ERROR', data: { message: 'Re-login failed' } });
  } finally {
    authInProgress = false;
  }
}

// Handle sign out request
async function handleSignOut() {
  try {
    await signOut(auth);
    clearSiteData();
    setUser(null);
    setAuthState('unauthenticated');
    
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = undefined;
    }
  } catch (error) {
    console.error('Error signing out:', error);
    sendToMainThread({ type: 'ERROR', data: { message: 'Sign-out failed' } });
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const command = event.data as AuthWorkerCommand;
  
  switch (command.type) {
    case 'SIGN_IN':
      handleSignIn();
      break;
    case 'SIGN_OUT':
      handleSignOut();
      break;
    case 'REFRESH_TOKEN':
      refreshGithubToken().catch(error => {
        console.error('Token refresh error:', error);
        sendToMainThread({ type: 'ERROR', data: { message: 'Token refresh failed' } });
      });
      break;
    default:
      console.warn('Unknown command:', command);
  }
});

// Initialize auth when the worker starts
initAuth();