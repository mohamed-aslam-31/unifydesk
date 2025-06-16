import { initializeApp, getApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";

// Initialize Firebase
let app: any = null;
let auth: any = null;
let googleProvider: any = null;
let firebaseConfig: any = null;

async function fetchFirebaseConfig() {
  try {
    const response = await fetch('/api/firebase-config');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Firebase config:', error);
    return null;
  }
}

async function initializeFirebase() {
  try {
    if (!firebaseConfig) {
      firebaseConfig = await fetchFirebaseConfig();
    }

    console.log('Firebase Config:', {
      apiKey: firebaseConfig?.apiKey ? 'Set' : 'Missing',
      authDomain: firebaseConfig?.authDomain,
      projectId: firebaseConfig?.projectId,
      storageBucket: firebaseConfig?.storageBucket,
      appId: firebaseConfig?.appId ? 'Set' : 'Missing'
    });

    if (firebaseConfig?.apiKey && firebaseConfig?.projectId && firebaseConfig?.appId) {
      try {
        app = initializeApp(firebaseConfig);
      } catch (error: any) {
        if (error.code === 'app/duplicate-app') {
          app = getApp();
        } else {
          throw error;
        }
      }
      
      auth = getAuth(app);
      googleProvider = new GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      console.log('Firebase initialized successfully');
      return true;
    } else {
      console.log('Firebase initialization skipped - add API keys to enable Google auth');
      return false;
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return false;
  }
}

// Initialize on module load
const isFirebaseReady = initializeFirebase();

export { auth, googleProvider };

// Call this function when the user clicks on the "Login" button
export function signInWithGoogle() {
  if (!isFirebaseReady || !auth || !googleProvider) {
    console.error('Firebase not properly initialized. Please check your Firebase configuration.');
    throw new Error('Firebase authentication is not available. Please ensure Google sign-in is enabled in your Firebase console.');
  }
  
  console.log('Initiating Google sign-in...');
  try {
    return signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.error('Error initiating Google sign-in:', error);
    
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google sign-in is not enabled. Please enable Google authentication in your Firebase console under Authentication > Sign-in method.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in. Please add your domain to the authorized domains list in Firebase console.');
    } else {
      throw new Error(`Google sign-in failed: ${error.message}`);
    }
  }
}

// Call this function on page load when the user is redirected back to your site
export async function handleGoogleRedirect() {
  if (!auth) {
    console.warn('Firebase not initialized. Skipping Google redirect handling.');
    return null;
  }
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // This gives you a Google Access Token. You can use it to access Google APIs.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      // The signed-in user info.
      const user = result.user;
      console.log('Google redirect successful:', user.email);
      return { user, token };
    }
    return null;
  } catch (error: any) {
    // Handle Errors here.
    const errorCode = error.code;
    const errorMessage = error.message;
    // The email of the user's account used.
    const email = error.customData?.email;
    // The AuthCredential type that was used.
    const credential = GoogleAuthProvider.credentialFromError(error);
    
    console.error('Google sign-in error:', { errorCode, errorMessage, email });
    
    if (errorCode === 'auth/unauthorized-domain') {
      throw new Error('This domain is not authorized for Google sign-in. Please contact support.');
    }
    
    throw error;
  }
}

// Sign out function
export function signOutUser() {
  if (!auth) {
    console.warn('Firebase not initialized. Cannot sign out.');
    return Promise.resolve();
  }
  return signOut(auth);
}

// Auth state listener
export function onAuthStateChange(callback: (user: any) => void) {
  if (!auth) {
    console.warn('Firebase not initialized. Auth state monitoring disabled.');
    callback(null);
    return () => {}; // Return empty unsubscribe function
  }
  return onAuthStateChanged(auth, callback);
}