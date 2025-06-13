import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  appId: firebaseConfig.appId ? 'Set' : 'Missing'
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Call this function when the user clicks on the "Login" button
export function signInWithGoogle() {
  console.log('Initiating Google sign-in...');
  try {
    return signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error('Error initiating Google sign-in:', error);
    throw error;
  }
}

// Call this function on page load when the user is redirected back to your site
export async function handleGoogleRedirect() {
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
  return signOut(auth);
}

// Auth state listener
export function onAuthStateChange(callback: (user: any) => void) {
  return onAuthStateChanged(auth, callback);
}