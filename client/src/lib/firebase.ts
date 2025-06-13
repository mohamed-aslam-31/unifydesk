import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "default_api_key",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "unifydesk-233f4"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "unifydesk-233f4",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "unifydesk-233f4"}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "default_app_id",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  return signInWithRedirect(auth, googleProvider);
};

export const handleGoogleRedirect = async () => {
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
  return signOut(auth);
};
