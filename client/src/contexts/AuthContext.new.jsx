import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check user status periodically
  useEffect(() => {
    let statusCheckInterval;

    if (user) {
      // Check user status every 30 seconds
      statusCheckInterval = setInterval(async () => {
        try {
          const isActive = await apiService.checkUserStatus();
          if (!isActive) {
            // User has been deactivated, force logout
            toast({
              title: "Account Deactivated",
              description: "Your account has been deactivated by an administrator. Please contact support.",
              variant: "destructive",
              duration: 10000,
            });
            logout();
          }
        } catch (error) {
          console.error('Status check failed:', error);
          // If status check fails due to auth error, logout
          if (error.message.includes('token') || error.message.includes('401') || error.message.includes('deactivated')) {
            if (error.message.includes('deactivated')) {
              toast({
                title: "Account Deactivated",
                description: "Your account has been deactivated by an administrator. Please contact support.",
                variant: "destructive",
                duration: 10000,
              });
            }
            logout();
          }
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [user, toast]);

  useEffect(() => {
    // Check if user is logged in on app start
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          // Verify token is still valid and user is active
          const response = await apiService.verifyToken();
          if (response.success) {
            setUser(response.data.user);
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          if (error.message.includes('deactivated')) {
            toast({
              title: "Account Deactivated",
              description: "Your account has been deactivated. Please contact support.",
              variant: "destructive",
              duration: 10000,
            });
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [toast]);

  const login = async (credentials) => {
    try {
      const response = await apiService.login(credentials);
      if (response.success) {
        const { user: userData, token } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.firstName}!`,
          variant: "default",
        });
        
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, message: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiService.register(userData);
      if (response.success) {
        const { user: newUser, token } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
        
        toast({
          title: "Registration Successful",
          description: `Welcome, ${newUser.firstName}! Your account has been created.`,
          variant: "default",
        });
        
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
      variant: "default",
    });
  };

  const updateUser = (updatedUserData) => {
    const updatedUser = { ...user, ...updatedUserData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};