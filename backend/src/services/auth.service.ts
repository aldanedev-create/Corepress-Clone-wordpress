// backend/src/services/auth.service.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User, { IUser, UserRole } from '../models/User';
import { JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_SALT_ROUNDS } from '../config/env';
import { ActivityLogService } from './activity.service';
import { AppError } from '../middleware/error.middleware';

// Auth service interface
export interface IAuthService {
  register(userData: RegisterData): Promise<AuthResult>;
  login(email: string, password: string, ip?: string, userAgent?: string): Promise<AuthResult>;
  refreshToken(refreshToken: string): Promise<{ token: string }>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  forgotPassword(email: string, ip?: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  logout(userId: string, ip?: string): Promise<void>;
  deactivateUser(userId: string, adminId: string): Promise<void>;
  reactivateUser(userId: string, adminId: string): Promise<void>;
  getUserById(userId: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null>;
  deleteUser(userId: string, adminId: string): Promise<void>;
  listUsers(options: ListUsersOptions): Promise<{ users: IUser[]; total: number }>;
}

// Types
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  avatar?: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar: string;
    isActive: boolean;
    lastLogin?: Date;
  };
  token: string;
  refreshToken?: string;
}

export interface ListUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Auth service implementation
class AuthService implements IAuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Register new user
  async register(userData: RegisterData): Promise<AuthResult> {
    try {
      const { name, email, password, role, avatar } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError('User already exists with this email', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      // Create user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: role || 'viewer',
        avatar: avatar || '',
        isActive: true
      });

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Log activity
      await ActivityLogService.log({
        userId: user._id.toString(),
        action: 'REGISTER',
        details: `User ${user.email} registered`,
        severity: 'info'
      });

      return this.formatAuthResult(user, token, refreshToken);
    } catch (error) {
      throw error;
    }
  }

  // Login user
  async login(email: string, password: string, ip?: string, userAgent?: string): Promise<AuthResult> {
    try {
      // Find user with password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        // Log failed attempt
        await ActivityLogService.log({
          userId: null,
          action: 'LOGIN_FAILED',
          details: `Failed login attempt for ${email}`,
          ipAddress: ip || 'unknown',
          userAgent: userAgent || 'unknown'
        });
        throw new AppError('Invalid email or password', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError('Account is deactivated. Please contact admin.', 403);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        await ActivityLogService.log({
          userId: user._id.toString(),
          action: 'LOGIN_FAILED',
          details: `Failed login attempt for ${user.email}`,
          ipAddress: ip || 'unknown',
          userAgent: userAgent || 'unknown'
        });
        throw new AppError('Invalid email or password', 401);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // Log successful login
      await ActivityLogService.log({
        userId: user._id.toString(),
        action: 'LOGIN',
        details: `User ${user.email} logged in`,
        ipAddress: ip || 'unknown',
        userAgent: userAgent || 'unknown'
      });

      return this.formatAuthResult(user, token, refreshToken);
    } catch (error) {
      throw error;
    }
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      const user = await User.findById(decoded.id);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.isActive) {
        throw new AppError('Account is deactivated', 403);
      }

      // Generate new token
      const token = this.generateToken(user);

      return { token };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token has expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      }
      throw error;
    }
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user with password
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
      user.password = hashedPassword;
      await user.save();

      // Log activity
      await ActivityLogService.log({
        userId: user._id.toString(),
        action: 'PASSWORD_CHANGE',
        details: `User ${user.email} changed password`
      });
    } catch (error) {
      throw error;
    }
  }

  // Forgot password
  async forgotPassword(email: string, ip?: string): Promise<void> {
    try {
      const user = await User.findOne({ email });
      
      // For security, don't reveal if user exists
      if (!user) {
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Save token in database
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // Log activity
      await ActivityLogService.log({
        userId: user._id.toString(),
        action: 'PASSWORD_RESET_REQUEST',
        details: `Password reset requested for ${user.email}`,
        ipAddress: ip || 'unknown'
      });

      // TODO: Send email with reset link
      // const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
      
    } catch (error) {
      throw error;
    }
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Hash token for comparison
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user with token
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
      
      // Update user
      user.password = hashedPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      // Log activity
      await ActivityLogService.log({
        userId: user._id.toString(),
        action: 'PASSWORD_RESET_SUCCESS',
        details: `Password reset successful for ${user.email}`
      });
    } catch (error) {
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      // Implementation for email verification
      // Similar to reset password but with verification token
      throw new AppError('Email verification not implemented yet', 501);
    } catch (error) {
      throw error;
    }
  }

  // Logout
  async logout(userId: string, ip?: string): Promise<void> {
    try {
      // Log logout activity
      await ActivityLogService.log({
        userId,
        action: 'LOGOUT',
        details: `User logged out`,
        ipAddress: ip || 'unknown'
      });
    } catch (error) {
      throw error;
    }
  }

  // Deactivate user
  async deactivateUser(userId: string, adminId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Prevent self-deactivation
      if (userId === adminId) {
        throw new AppError('You cannot deactivate your own account', 400);
      }

      user.isActive = false;
      await user.save();

      await ActivityLogService.log({
        userId: adminId,
        action: 'USER_UPDATE',
        details: `Admin deactivated user: ${user.email}`
      });
    } catch (error) {
      throw error;
    }
  }

  // Reactivate user
  async reactivateUser(userId: string, adminId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      user.isActive = true;
      await user.save();

      await ActivityLogService.log({
        userId: adminId,
        action: 'USER_UPDATE',
        details: `Admin reactivated user: ${user.email}`
      });
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      return await User.findById(userId).lean();
    } catch (error) {
      throw error;
    }
  }

  // Get user by email
  async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email }).lean();
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null> {
    try {
      // Remove sensitive fields
      delete data.password;
      delete data.resetPasswordToken;
      delete data.resetPasswordExpires;

      const user = await User.findByIdAndUpdate(
        userId,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new AppError('User not found', 404);
      }

      await ActivityLogService.log({
        userId,
        action: 'USER_UPDATE',
        details: `User updated profile`
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  async deleteUser(userId: string, adminId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Prevent self-deletion
      if (userId === adminId) {
        throw new AppError('You cannot delete your own account', 400);
      }

      // Prevent deleting super admin by non-super admin
      if (user.role === 'super_admin') {
        const admin = await User.findById(adminId);
        if (admin?.role !== 'super_admin') {
          throw new AppError('Only super admin can delete super admin accounts', 403);
        }
      }

      await User.findByIdAndDelete(userId);

      await ActivityLogService.log({
        userId: adminId,
        action: 'USER_DELETE',
        details: `Admin deleted user: ${user.email}`
      });
    } catch (error) {
      throw error;
    }
  }

  // List users
  async listUsers(options: ListUsersOptions = {}): Promise<{ users: IUser[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      if (role) {
        filter.role = role;
      }
      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      // Sort
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const [users, total] = await Promise.all([
        User.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter)
      ]);

      return { users, total };
    } catch (error) {
      throw error;
    }
  }

  // Generate JWT token
  private generateToken(user: IUser): string {
    return jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  // Generate refresh token
  private generateRefreshToken(user: IUser): string {
    return jwt.sign(
      {
        id: user._id.toString(),
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  // Format auth result
  private formatAuthResult(user: IUser, token: string, refreshToken: string): AuthResult {
    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      },
      token,
      refreshToken
    };
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
export default authService;