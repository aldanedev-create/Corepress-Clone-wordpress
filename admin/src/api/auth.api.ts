// admin/src/api/auth.api.ts
import { get, post, put, del } from './axios';
import { User, LoginCredentials, RegisterData, AuthResponse, PasswordChangeData } from '../types/user.types';

// Auth API endpoints
const AUTH_ENDPOINTS = {
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  REFRESH_TOKEN: '/auth/refresh-token',
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  UPDATE_PROFILE: '/auth/profile'
};

// Register user
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  return await post<AuthResponse>(AUTH_ENDPOINTS.REGISTER, data);
};

// Login user
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, credentials);
  
  // Store tokens
  if (response.token) {
    localStorage.setItem('token', response.token);
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
  }
  
  return response;
};

// Logout user
export const logout = async (): Promise<void> => {
  try {
    await post(AUTH_ENDPOINTS.LOGOUT);
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage regardless of API response
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};

// Get current user
export const getCurrentUser = async (): Promise<User> => {
  return await get<User>(AUTH_ENDPOINTS.ME);
};

// Refresh token
export const refreshToken = async (): Promise<{ token: string }> => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await post<{ token: string }>(AUTH_ENDPOINTS.REFRESH_TOKEN, { refreshToken });
  
  if (response.token) {
    localStorage.setItem('token', response.token);
  }
  
  return response;
};

// Change password
export const changePassword = async (data: PasswordChangeData): Promise<void> => {
  await put(AUTH_ENDPOINTS.CHANGE_PASSWORD, data);
};

// Forgot password
export const forgotPassword = async (email: string): Promise<void> => {
  await post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });
};

// Reset password
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  await post(AUTH_ENDPOINTS.RESET_PASSWORD, { token, newPassword });
};

// Update profile
export const updateProfile = async (data: Partial<User>): Promise<User> => {
  const user = await put<User>(AUTH_ENDPOINTS.UPDATE_PROFILE, data);
  
  // Update stored user data
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
  
  return user;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};

// Get stored user
export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    return null;
  }
};

// Get auth token
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

// Clear auth data
export const clearAuthData = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export default {
  register,
  login,
  logout,
  getCurrentUser,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  isAuthenticated,
  getStoredUser,
  getAuthToken,
  setAuthToken,
  clearAuthData
};