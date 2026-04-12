import { api } from '@/api/apiClient';
import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      setAppPublicSettings({ id: 'local', public_settings: {} });
      await checkUserAuth();
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await api.auth.me();
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
      } else {
        // Not logged in
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const refreshUser = async () => {
    try {
      const fresh = await api.auth.me();
      if (fresh) setUser(fresh);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem('streakPopupShown');
    sessionStorage.removeItem('pendingStreakPopup');
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      api.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      api.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Avoid redirect loops: if we're already on Login or Register, do nothing
    const path = window.location?.pathname || '';
    if (path === '/Login' || path === '/Register') return;

    // Use the SDK's redirectToLogin method
    api.auth.redirectToLogin();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
