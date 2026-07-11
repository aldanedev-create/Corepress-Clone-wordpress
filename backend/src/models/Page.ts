// backend/src/models/Page.ts
import mongoose, { Schema, Document } from 'mongoose';

// Page status types
export type PageStatus = 'draft' | 'published';

// Page interface
export interface IPage extends Document {
  title: string;
  slug: string;
  content: any; // Rich text content from TipTap
  status: PageStatus;
  seoTitle: string;
  seoDescription: string;
  template: string;
  parentPage?: mongoose.Types.ObjectId;
  order: number;
  isHomepage: boolean;
  isPrivacyPolicy: boolean;
  isTermsOfService: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Page schema
const PageSchema = new Schema<IPage>(
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
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft'
    },
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
    template: {
      type: String,
      enum: ['default', 'full-width', 'landing', 'contact'],
      default: 'default'
    },
    parentPage: {
      type: Schema.Types.ObjectId,
      ref: 'Page',
      default: null
    },
    order: {
      type: Number,
      default: 0
    },
    isHomepage: {
      type: Boolean,
      default: false
    },
    isPrivacyPolicy: {
      type: Boolean,
      default: false
    },
    isTermsOfService: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
PageSchema.index({ slug: 1 });
PageSchema.index({ status: 1 });
PageSchema.index({ parentPage: 1 });
PageSchema.index({ order: 1 });

// Virtual field for URL
PageSchema.virtual('url').get(function(this: IPage) {
  return this.isHomepage ? '/' : `/${this.slug}`;
});

// Virtual field for children pages
PageSchema.virtual('children', {
  ref: 'Page',
  localField: '_id',
  foreignField: 'parentPage'
});

// Pre-save middleware
PageSchema.pre('save', function(next) {
  const page = this as IPage;
  
  // Set default SEO values
  if (!page.seoTitle) {
    page.seoTitle = page.title;
  }
  
  // Only one homepage
  if (page.isHomepage) {
    Page.updateMany(
      { isHomepage: true, _id: { $ne: page._id } },
      { isHomepage: false }
    ).exec();
  }
  
  next();
});

// Pre-save middleware to update timestamps
PageSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Static method to get published pages
PageSchema.statics.getPublished = function() {
  return this.find({ status: 'published' });
};

// Static method to get homepage
PageSchema.statics.getHomepage = function() {
  return this.findOne({ isHomepage: true, status: 'published' });
};

// Static method to get menu pages
PageSchema.statics.getMenuPages = function() {
  return this.find({ 
    status: 'published',
    isHomepage: { $ne: true }
  }).sort({ order: 1 });
};

// Create and export model
const Page = mongoose.model<IPage>('Page', PageSchema);
export default Page;