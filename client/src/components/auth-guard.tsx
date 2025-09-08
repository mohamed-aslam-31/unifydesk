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
  const [, setLocation] = useLocation();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && requireAuth && !user) {
      setLocation(redirectTo);
    }
  }, [user, isLoading, requireAuth, redirectTo, setLocation]);

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

  // If user is authenticated but tries to access auth pages (login/signup), redirect to choose-role
  if (!requireAuth && user && (window.location.pathname === '/login' || window.location.pathname === '/signup')) {
    // Check if user needs to choose a role
    if (!user.role) {
      setLocation('/choose-role');
      return null;
    }
    
    // Redirect based on role status
    if (user.roleStatus === 'pending') {
      setLocation('/pending');
      return null;
    } else if (user.roleStatus === 'approved') {
      setLocation('/dashboard');
      return null;
    } else {
      setLocation('/home');
      return null;
    }
  }

  return <>{children}</>;
}