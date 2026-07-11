// backend/src/models/Post.ts
import mongoose, { Schema, Document } from 'mongoose';

// Post status types
export type PostStatus = 'draft' | 'published' | 'archived';

// Post interface
export interface IPost extends Document {
  title: string;
  slug: string;
  content: any; // Rich text content from TipTap
  excerpt: string;
  status: PostStatus;
  featuredImage: string;
  author: mongoose.Types.ObjectId;
  categories: mongoose.Types.ObjectId[];
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  views: number;
  likes: number;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Post schema
const PostSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format']
    },
    content: {
      type: Schema.Types.Mixed,
      required: [true, 'Content is required']
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, 'Excerpt cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft'
    },
    featuredImage: {
      type: String,
      trim: true,
      default: ''
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required']
    },
    categories: [{
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: []
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    seoTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'SEO title should be under 60 characters']
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'SEO description should be under 160 characters']
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    publishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
PostSchema.index({ slug: 1 });
PostSchema.index({ author: 1 });
PostSchema.index({ categories: 1 });
PostSchema.index({ status: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ title: 'text', excerpt: 'text', content: 'text' });

// Virtual field for reading time
PostSchema.virtual('readingTime').get(function(this: IPost) {
  const text = this.content?.text || '';
  const wordsPerMinute = 200;
  const words = text.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return {
    minutes,
    text: `${minutes} min read`
  };
});

// Virtual field for URL
PostSchema.virtual('url').get(function(this: IPost) {
  return `/blog/${this.slug}`;
});

// Pre-save middleware to generate excerpt
PostSchema.pre('save', function(next) {
  const post = this as IPost;
  
  // Generate excerpt from content if not provided
  if (!post.excerpt && post.content) {
    const text = post.content?.text || '';
    const plainText = text.replace(/<[^>]*>/g, '');
    post.excerpt = plainText.substring(0, 200);
  }
  
  // Set publishedAt when status changes to published
  if (post.status === 'published' && !post.publishedAt) {
    post.publishedAt = new Date();
  }
  
  next();
});

// Pre-save middleware to sanitize tags
PostSchema.pre('save', function(next) {
  const post = this as IPost;
  
  // Remove duplicates and empty tags
  if (post.tags && Array.isArray(post.tags)) {
    post.tags = [...new Set(post.tags.filter(tag => tag && tag.trim()))];
  }
  
  // Ensure categories is array
  if (!post.categories) {
    post.categories = [];
  }
  
  // Ensure tags is array
  if (!post.tags) {
    post.tags = [];
  }
  
  next();
});

// Pre-save middleware to update timestamps
PostSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Static method to get published posts
PostSchema.statics.getPublished = function() {
  return this.find({ status: 'published' });
};

// Static method to get posts by category
PostSchema.statics.findByCategory = function(categoryId: string) {
  return this.find({ 
    categories: categoryId, 
    status: 'published' 
  });
};

// Static method to get posts by tag
PostSchema.statics.findByTag = function(tag: string) {
  return this.find({ 
    tags: tag, 
    status: 'published' 
  });
};

// Static method to get popular posts
PostSchema.statics.getPopular = function(limit: number = 5) {
  return this.find({ status: 'published' })
    .sort({ views: -1 })
    .limit(limit);
};

// Static method to get recent posts
PostSchema.statics.getRecent = function(limit: number = 10) {
  return this.find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Create and export model
const Post = mongoose.model<IPost>('Post', PostSchema);
export default Post;