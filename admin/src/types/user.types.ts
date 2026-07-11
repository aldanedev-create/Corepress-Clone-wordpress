// admin/src/types/user.types.ts

// User role types
export type UserRole = 'super_admin' | 'admin' | 'editor' | 'author' | 'viewer';

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Login credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

// Register data
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  avatar?: string;
}

// Auth response
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Password change data
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

// Forgot password data
export interface ForgotPasswordData {
  email: string;
}

// Reset password data
export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

// User filters for listing
export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// User permissions
export interface UserPermissions {
  posts: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    publish: boolean;
  };
  pages: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  users: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  categories: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  media: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  settings: {
    read: boolean;
    update: boolean;
  };
  seo: {
    create: boolean;
    read: boolean;
    update: boolean;
  };
}

// Role labels
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  author: 'Author',
  viewer: 'Viewer'
};

// Role colors for badges
export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  author: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
};

// Role hierarchy (for permission checks)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 5,
  admin: 4,
  editor: 3,
  author: 2,
  viewer: 1
};

// Check if user has role or higher
export const hasRoleOrHigher = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Check if user can manage users
export const canManageUsers = (userRole: UserRole): boolean => {
  return ['super_admin', 'admin'].includes(userRole);
};

// Check if user can manage settings
export const canManageSettings = (userRole: UserRole): boolean => {
  return ['super_admin', 'admin'].includes(userRole);
};

// Check if user can publish posts
export const canPublishPosts = (userRole: UserRole): boolean => {
  return ['super_admin', 'admin', 'editor'].includes(userRole);
};

// Check if user can delete posts
export const canDeletePosts = (userRole: UserRole): boolean => {
  return ['super_admin', 'admin', 'editor'].includes(userRole);
};

// Check if user can manage media
export const canManageMedia = (userRole: UserRole): boolean => {
  return ['super_admin', 'admin', 'editor', 'author'].includes(userRole);
};

// Get user permissions
export const getUserPermissions = (userRole: UserRole): UserPermissions => {
  const basePermissions: UserPermissions = {
    posts: { create: false, read: false, update: false, delete: false, publish: false },
    pages: { create: false, read: false, update: false, delete: false },
    users: { create: false, read: false, update: false, delete: false },
    categories: { create: false, read: false, update: false, delete: false },
    media: { create: false, read: false, update: false, delete: false },
    settings: { read: false, update: false },
    seo: { create: false, read: false, update: false }
  };

  switch (userRole) {
    case 'super_admin':
      return {
        posts: { create: true, read: true, update: true, delete: true, publish: true },
        pages: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        categories: { create: true, read: true, update: true, delete: true },
        media: { create: true, read: true, update: true, delete: true },
        settings: { read: true, update: true },
        seo: { create: true, read: true, update: true }
      };
    case 'admin':
      return {
        ...basePermissions,
        posts: { create: true, read: true, update: true, delete: true, publish: true },
        pages: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        categories: { create: true, read: true, update: true, delete: true },
        media: { create: true, read: true, update: true, delete: true },
        settings: { read: true, update: true },
        seo: { create: true, read: true, update: true }
      };
    case 'editor':
      return {
        ...basePermissions,
        posts: { create: true, read: true, update: true, delete: false, publish: true },
        pages: { create: true, read: true, update: true, delete: false },
        categories: { create: false, read: true, update: false, delete: false },
        media: { create: true, read: true, update: false, delete: false },
        seo: { create: true, read: true, update: false }
      };
    case 'author':
      return {
        ...basePermissions,
        posts: { create: true, read: true, update: true, delete: false, publish: false },
        pages: { create: false, read: true, update: false, delete: false },
        categories: { create: false, read: true, update: false, delete: false },
        media: { create: true, read: true, update: false, delete: false }
      };
    case 'viewer':
    default:
      return basePermissions;
  }
};