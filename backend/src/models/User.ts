// backend/src/models/User.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

// User role types
export type UserRole = 'super_admin' | 'admin' | 'editor' | 'author' | 'viewer';

// User interface
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar: string;
  isActive: boolean;
  lastLogin: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isAdmin(): boolean;
  hasPermission(action: string, resource: string): boolean;
}

// User schema
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Don't return password by default
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'editor', 'author', 'viewer'],
      default: 'viewer'
    },
    avatar: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ name: 'text' });

// Virtual field for full name
UserSchema.virtual('fullName').get(function(this: IUser) {
  return this.name;
});

// Virtual field for post count
UserSchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'author',
  count: true
});

// Virtual field for comment count
UserSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'author',
  count: true
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  const user = this as IUser;
  
  // Only hash password if it's modified
  if (!user.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Pre-save middleware to update timestamps
UserSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user is admin
UserSchema.methods.isAdmin = function(): boolean {
  return ['super_admin', 'admin'].includes(this.role);
};

// Method to check permissions
UserSchema.methods.hasPermission = function(
  action: string,
  resource: string
): boolean {
  const permissions: Record<string, Record<string, string[]>> = {
    super_admin: {
      all: ['*']
    },
    admin: {
      posts: ['create', 'read', 'update', 'delete', 'publish'],
      pages: ['create', 'read', 'update', 'delete'],
      users: ['read', 'update', 'delete'],
      categories: ['create', 'read', 'update', 'delete'],
      media: ['create', 'read', 'update', 'delete'],
      settings: ['read', 'update']
    },
    editor: {
      posts: ['create', 'read', 'update', 'publish'],
      pages: ['create', 'read', 'update'],
      categories: ['read'],
      media: ['create', 'read']
    },
    author: {
      posts: ['create', 'read', 'update'],
      pages: ['read'],
      categories: ['read'],
      media: ['create', 'read']
    },
    viewer: {
      posts: ['read'],
      pages: ['read']
    }
  };

  // Super admin has all permissions
  if (this.role === 'super_admin') {
    return true;
  }

  // Check if user has permission for action on resource
  const rolePermissions = permissions[this.role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action) || resourcePermissions.includes('*');
};

// Static method to find by email
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email });
};

// Static method to find active users
UserSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Create and export model
const User = mongoose.model<IUser>('User', UserSchema);
export default User;