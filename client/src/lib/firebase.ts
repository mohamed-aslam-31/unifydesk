import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";

// Firebase configuration - only initialize if API key is provided
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: any = null;
if (import.meta.env.VITE_FIREBASE_API_KEY) {
  app = initializeApp(firebaseConfig);
}
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  if (!auth) {
    throw new Error("Firebase not initialized. Please provide Firebase configuration.");
  }
  return signInWithRedirect(auth, googleProvider);
};

export const handleGoogleRedirect = async () => {
  if (!auth) {
    console.warn("Firebase not initialized. Skipping Google redirect handling.");
    return null;
  }
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Google redirect error:", error);
    throw error;
  }
};

export const signOutUser = () => {
  if (!auth) {
    throw new Error("Firebase not initialized. Please provide Firebase configuration.");
  }
  return signOut(auth);
};
