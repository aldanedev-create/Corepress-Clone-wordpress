// admin/src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as authApi from '../api/auth.api';
import { User, LoginCredentials, RegisterData, AuthResponse } from '../types/user.types';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Check authentication
  const checkAuth = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Check if token exists
      const token = authApi.getAuthToken();
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Try to get current user
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setIsAuthenticated(true);
      
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid auth data
      authApi.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      const response = await authApi.login({ email, password });
      setUser(response.user);
      setIsAuthenticated(true);
      
      toast.success('Login successful!');
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Register
  const register = useCallback(async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    
    try {
      const response = await authApi.register(data);
      setUser(response.user);
      setIsAuthenticated(true);
      
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      authApi.clearAuthData();
      setIsLoading(false);
      
      toast.success('Logged out successfully');
      navigate('/login');
    }
  }, [navigate]);

  // Update profile
  const updateProfile = useCallback(async (data: Partial<User>): Promise<void> => {
    setIsLoading(true);
    
    try {
      const updatedUser = await authApi.updateProfile(data);
      setUser(updatedUser);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('Password changed successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Forgot password
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      await authApi.forgotPassword(email);
      toast.success('Password reset link sent to your email');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset link';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<void> => {
    setIsLoading(true);
    
    try {
      await authApi.resetPassword(token, newPassword);
      toast.success('Password reset successfully. Please login.');
      navigate('/login');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword
  };
};

export default useAuth;