// backend/src/models/Category.ts
import mongoose, { Schema, Document } from 'mongoose';

// Category interface
export interface ICategory extends Document {
  name: string;
  slug: string;
  description: string;
  parentCategory: mongoose.Types.ObjectId | null;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Category schema
const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [50, 'Category name cannot exceed 50 characters'],
      unique: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    color: {
      type: String,
      trim: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
      default: '#6366f1'
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
CategorySchema.index({ name: 1 });
CategorySchema.index({ slug: 1 });
CategorySchema.index({ parentCategory: 1 });

// Virtual field for post count
CategorySchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'categories',
  count: true
});

// Virtual field for subcategories
CategorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});

// Virtual field for parent category
CategorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentCategory',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware
CategorySchema.pre('save', function(next) {
  const category = this as ICategory;
  
  // Set default color if not provided
  if (!category.color) {
    const colors = [
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', 
      '#ec4899', '#f43f5e', '#ef4444', '#f97316',
      '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#10b981', '#14b8a6', '#06b6d4', '#3b82f6'
    ];
    const index = category.name.length % colors.length;
    category.color = colors[index];
  }
  
  next();
});

// Pre-save middleware to update timestamps
CategorySchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Static method to get root categories
CategorySchema.statics.getRootCategories = function() {
  return this.find({ parentCategory: null });
};

// Static method to get category tree
CategorySchema.statics.getTree = async function() {
  const categories = await this.find().lean();
  
  const buildTree = (parentId: string | null = null): any[] => {
    const children = categories.filter(cat => 
      (cat.parentCategory?.toString() === parentId?.toString() || 
       (!cat.parentCategory && !parentId))
    );
    
    return children.map(cat => ({
      ...cat,
      children: buildTree(cat._id.toString())
    }));
  };
  
  return buildTree(null);
};

// Static method to get category with posts
CategorySchema.statics.getWithPosts = async function(slug: string) {
  const category = await this.findOne({ slug });
  if (!category) return null;
  
  const posts = await mongoose.model('Post').find({
    categories: category._id,
    status: 'published'
  }).populate('author', 'name email avatar');
  
  return {
    ...category.toObject(),
    posts
  };
};

// Create and export model
const Category = mongoose.model<ICategory>('Category', CategorySchema);
export default Category;