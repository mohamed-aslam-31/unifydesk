import { useEffect } from "react";
import { useLocation } from "wouter";
import { useSession } from "@/hooks/use-session";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = "/login" 
}: AuthGuardProps) {
  const [currentLocation, setLocation] = useLocation();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (isLoading) return;

    // Handle protected routes - require authentication
    if (requireAuth && !user) {
      setLocation(redirectTo);
      return;
    }

    // Handle public routes - redirect authenticated users appropriately
    if (!requireAuth && user) {
      const currentPath = currentLocation;
      
      if (currentPath === '/login' || currentPath === '/signup') {
        // Check if user needs to choose a role
        if (!user.role) {
          setLocation('/choose-role');
          return;
        }
        
        // Redirect based on role status
        if (user.roleStatus === 'pending') {
          setLocation('/pending');
          return;
        } else if (user.roleStatus === 'approved') {
          setLocation('/dashboard');
          return;
        } else {
          setLocation('/home');
          return;
        }
      }
    }
  }, [user, isLoading, requireAuth, redirectTo, setLocation, currentLocation]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not authenticated, don't render children
  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}