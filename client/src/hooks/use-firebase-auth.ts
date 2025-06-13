import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, handleGoogleRedirect, onAuthStateChange, signInWithGoogle, signOutUser } from '@/lib/firebase';

interface FirebaseAuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useFirebaseAuth() {
  const [state, setState] = useState<FirebaseAuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Handle redirect result on app load
    handleGoogleRedirect()
      .then((result) => {
        if (result) {
          console.log('Google sign-in successful:', result.user);
        }
      })
      .catch((error) => {
        setState(prev => ({ ...prev, error: error.message }));
      });

    // Listen to auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      setState({
        user,
        loading: false,
        error: null,
      });
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      console.log('Starting Google sign-in process...');
      setState(prev => ({ ...prev, error: null }));
      await signInWithGoogle();
      console.log('Google sign-in redirect initiated');
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  };

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await signOutUser();
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  };

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
  };
}