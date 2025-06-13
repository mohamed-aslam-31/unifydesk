import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  roleStatus?: string;
}

interface UseSessionReturn {
  user: User | null;
  sessionToken: string;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export function useSession(): UseSessionReturn {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const token = localStorage.getItem("sessionToken");
        if (token) {
          setSessionToken(token);
          const userData = await getCurrentUser(token);
          setUser(userData.user);
        }
      } catch (error) {
        console.error("Session initialization error:", error);
        // Clear invalid session
        localStorage.removeItem("sessionToken");
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  const logout = () => {
    localStorage.removeItem("sessionToken");
    setUser(null);
    setSessionToken("");
  };

  return {
    user,
    sessionToken,
    isLoading,
    setUser,
    logout,
  };
}
