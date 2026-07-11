// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { generateToken } from '../utils/generateToken';
import { apiResponse } from '../utils/apiResponse';
import { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS } from '../config/env';
import { ActivityLogService } from '../services/activity.service';

// Types
interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'super_admin' | 'admin' | 'editor' | 'author' | 'viewer';
}

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  token: string;
}

// Register new user
export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const { name, email, password, role }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return apiResponse.error(res, 'User already exists with this email', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'viewer',
      isActive: true,
      avatar: req.body.avatar || '',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    // Log activity
    await ActivityLogService.log({
      userId: user._id.toString(),
      action: 'REGISTER',
      details: `User ${user.email} registered`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // Return response
    const response: AuthResponse = {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      token
    };

    return apiResponse.success(res, 'User registered successfully', response, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return apiResponse.error(res, 'Registration failed', 500);
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const { email, password }: LoginRequest = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return apiResponse.error(res, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return apiResponse.error(res, 'Account is deactivated. Please contact admin.', 403);
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Log failed attempt
      await ActivityLogService.log({
        userId: user._id.toString(),
        action: 'LOGIN_FAILED',
        details: `Failed login attempt for ${user.email}`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      return apiResponse.error(res, 'Invalid email or password', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    // Log successful login
    await ActivityLogService.log({
      userId: user._id.toString(),
      action: 'LOGIN',
      details: `User ${user.email} logged in`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // Return response
    const response: AuthResponse = {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      },
      token
    };

    return apiResponse.success(res, 'Login successful', response);
  } catch (error) {
    console.error('Login error:', error);
    return apiResponse.error(res, 'Login failed', 500);
  }
};

// Get current user
export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    // User is attached by auth middleware
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not found', 404);
    }

    // Get full user data from database
    const userData = await User.findById(user.id);
    if (!userData) {
      return apiResponse.error(res, 'User not found', 404);
    }

    const response = {
      id: userData._id.toString(),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      avatar: userData.avatar,
      isActive: userData.isActive,
      createdAt: userData.createdAt,
      lastLogin: userData.lastLogin
    };

    return apiResponse.success(res, 'User data retrieved', response);
  } catch (error) {
    console.error('Get current user error:', error);
    return apiResponse.error(res, 'Failed to get user data', 500);
  }
};

// Logout user
export const logout = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get user from request
    const user = req.user;
    
    if (user) {
      // Log logout activity
      await ActivityLogService.log({
        userId: user.id,
        action: 'LOGOUT',
        details: `User ${user.email} logged out`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });
    }

    // JWT is stateless, so we just inform client to clear token
    return apiResponse.success(res, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return apiResponse.error(res, 'Logout failed', 500);
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Generate new token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return apiResponse.success(res, 'Token refreshed', { token });
  } catch (error) {
    console.error('Refresh token error:', error);
    return apiResponse.error(res, 'Failed to refresh token', 500);
  }
};

// Change password
export const changePassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Get user with password
    const userData = await User.findById(user.id).select('+password');
    if (!userData) {
      return apiResponse.error(res, 'User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, userData.password);
    if (!isPasswordValid) {
      return apiResponse.error(res, 'Current password is incorrect', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    userData.password = hashedPassword;
    userData.updatedAt = new Date();
    await userData.save();

    // Log password change
    await ActivityLogService.log({
      userId: user.id,
      action: 'PASSWORD_CHANGE',
      details: `User ${user.email} changed password`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    return apiResponse.error(res, 'Failed to change password', 500);
  }
};

// Forgot password
export const forgotPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists
      return apiResponse.success(res, 'If the email exists, a reset link will be sent');
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save reset token in database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // TODO: Send email with reset link
    // This would integrate with email service
    // const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    // Log reset request
    await ActivityLogService.log({
      userId: user._id.toString(),
      action: 'PASSWORD_RESET_REQUEST',
      details: `Password reset requested for ${user.email}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'If the email exists, a reset link will be sent');
  } catch (error) {
    console.error('Forgot password error:', error);
    return apiResponse.error(res, 'Failed to process request', 500);
  }
};

// Reset password with token
export const resetPassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const { token, newPassword } = req.body;

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return apiResponse.error(res, 'Invalid or expired reset token', 400);
    }

    // Find user with token
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return apiResponse.error(res, 'Invalid or expired reset token', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = new Date();
    await user.save();

    // Log password reset
    await ActivityLogService.log({
      userId: user._id.toString(),
      action: 'PASSWORD_RESET_SUCCESS',
      details: `Password reset successful for ${user.email}`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password error:', error);
    return apiResponse.error(res, 'Failed to reset password', 500);
  }
};