import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { PropsWithChildren } from "react";
import { getCurrentUserProfileApiV1AuthMeGet } from "@openapi/sdk.gen";
import type { UserProfileResponse } from "@openapi/types.gen";

export const TOKEN_KEY = "agents-token";

// Session Context
interface SessionContextType {
  session: boolean;
  pending: boolean;
  userProfile: UserProfileResponse | null;
  setSession: (value: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Global session update function for interceptor use
let globalSetSession: ((value: boolean) => void) | null = null;

/**
 * Set global session update function (for interceptor use)
 */
export function setGlobalSessionUpdater(
  updater: ((value: boolean) => void) | null
) {
  globalSetSession = updater;
}

/**
 * Update global session state (called by interceptor)
 */
export function updateGlobalSession(value: boolean) {
  if (globalSetSession) {
    globalSetSession(value);
  }
}

/**
 * Check if token exists (only execute on client)
 */
function checkTokenExists(): boolean {
  if (typeof window === "undefined") return false;

  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  let cleanToken = token;
  if (cleanToken.startsWith(`"`) && cleanToken.endsWith(`"`)) {
    cleanToken = cleanToken.slice(1, -1);
  }

  return cleanToken.length > 0;
}

/**
 * Get current session state (based on token)
 */
export function getInitialSession(): boolean {
  return checkTokenExists();
}

/**
 * useSession hook - use in components
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}

/**
 * SessionProvider component - manages global session state
 */
export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState(false);
  const [pending, setPending] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(null);

  // Verify session state on initialization
  useEffect(() => {
    // Async verification process, ensure pending state only becomes false after verification completes
    const verifySession = async () => {
      // Check if token exists
      const hasToken = checkTokenExists();
      
      if (!hasToken) {
        setSession(false);
        setPending(false);
        return;
      }

      // If token exists, call API to verify token validity and get latest profile
      try {
        const response = await getCurrentUserProfileApiV1AuthMeGet();
        // API call successful, token is valid
        if (response.data) {
          setUserProfile(response.data);
          setSession(true);
        } else {
          setSession(false);
          setUserProfile(null);
        }
      } catch (error) {
        // API call failed (might be 401 or other error), token is invalid
        // Clear invalid token
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(TOKEN_KEY);
        }
        setUserProfile(null);
        setSession(false);
      } finally {
        setPending(false);
      }
    };

    verifySession();
  }, []);

  // Register global update function
  useEffect(() => {
    setGlobalSessionUpdater(setSession);
    return () => {
      setGlobalSessionUpdater(null);
    };
  }, []);

  // Function to refresh user profile
  const refreshProfile = useCallback(async () => {
    const hasToken = checkTokenExists();
    if (!hasToken) {
      setUserProfile(null);
      setSession(false);
      return;
    }

    try {
      const response = await getCurrentUserProfileApiV1AuthMeGet();
      if (response.data) {
        setUserProfile(response.data);
        setSession(true);
      } else {
        setSession(false);
        setUserProfile(null);
      }
    } catch (error) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(TOKEN_KEY);
      }
      setUserProfile(null);
      setSession(false);
    }
  }, []);

  // Listen for localStorage changes (handle multi-tab scenarios, only execute on client)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        refreshProfile();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshProfile]);

  // Create an enhanced setSession function that automatically refreshes profile when set to true
  const enhancedSetSession = useCallback((value: boolean) => {
    if (value) {
      refreshProfile();
    } else {
      setSession(false);
      setUserProfile(null);
    }
  }, [refreshProfile]);

  return (
    <SessionContext.Provider value={{ session, pending, userProfile, setSession: enhancedSetSession }}>
      {children}
    </SessionContext.Provider>
  );
}
