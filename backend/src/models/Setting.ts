// backend/src/models/Setting.ts
import mongoose, { Schema, Document } from 'mongoose';

// Navigation item interface
interface INavigationItem {
  id: string;
  label: string;
  url: string;
  order: number;
  target?: '_blank' | '_self';
  icon?: string;
  children?: INavigationItem[];
}

// Setting interface
export interface ISetting extends Document {
  // Site Identity
  siteName: string;
  siteDescription: string;
  siteLogo: string;
  siteFavicon: string;
  siteUrl: string;
  
  // Design
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  bodyBackground: string;
  
  // Content
  footerText: string;
  navigationMenu: INavigationItem[];
  homePageLayout: string;
  postsPerPage: number;
  
  // SEO
  analyticsId: string;
  googleSiteVerification: string;
  facebookPixelId: string;
  twitterHandle: string;
  
  // Social
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  
  // Contact
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  
  // Time & Date
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  
  // Custom Code
  customCss: string;
  customJs: string;
  customHead: string;
  customFooter: string;
  
  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
  
  // Features
  enableComments: boolean;
  enableGdpr: boolean;
  enableAnalytics: boolean;
  
  // Metadata
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Navigation item schema
const NavigationItemSchema = new Schema<INavigationItem>({
  id: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  target: {
    type: String,
    enum: ['_blank', '_self'],
    default: '_self'
  },
  icon: {
    type: String,
    trim: true
  },
  children: [this]
});

// Setting schema
const SettingSchema = new Schema<ISetting>(
  {
    // Site Identity
    siteName: {
      type: String,
      required: [true, 'Site name is required'],
      trim: true,
      default: 'CorePress CMS'
    },
    siteDescription: {
      type: String,
      trim: true,
      default: 'A modern content management system',
      maxlength: [300, 'Description cannot exceed 300 characters']
    },
    siteLogo: {
      type: String,
      trim: true,
      default: ''
    },
    siteFavicon: {
      type: String,
      trim: true,
      default: ''
    },
    siteUrl: {
      type: String,
      trim: true,
      default: ''
    },
    
    // Design
    primaryColor: {
      type: String,
      trim: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
      default: '#2563eb'
    },
    secondaryColor: {
      type: String,
      trim: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
      default: '#64748b'
    },
    accentColor: {
      type: String,
      trim: true,
      match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'],
      default: '#8b5cf6'
    },
    fontFamily: {
      type: String,
      trim: true,
      default: 'Inter, sans-serif'
    },
    bodyBackground: {
      type: String,
      trim: true,
      default: '#ffffff'
    },
    
    // Content
    footerText: {
      type: String,
      trim: true,
      default: '© 2024 CorePress CMS. All rights reserved.'
    },
    navigationMenu: {
      type: [NavigationItemSchema],
      default: [
        { id: 'home', label: 'Home', url: '/', order: 0 },
        { id: 'blog', label: 'Blog', url: '/blog', order: 1 },
        { id: 'about', label: 'About', url: '/about', order: 2 },
        { id: 'contact', label: 'Contact', url: '/contact', order: 3 }
      ]
    },
    homePageLayout: {
      type: String,
      enum: ['grid', 'list', 'masonry'],
      default: 'grid'
    },
    postsPerPage: {
      type: Number,
      min: [1, 'Posts per page must be at least 1'],
      max: [100, 'Posts per page cannot exceed 100'],
      default: 10
    },
    
    // SEO
    analyticsId: {
      type: String,
      trim: true,
      default: ''
    },
    googleSiteVerification: {
      type: String,
      trim: true,
      default: ''
    },
    facebookPixelId: {
      type: String,
      trim: true,
      default: ''
    },
    twitterHandle: {
      type: String,
      trim: true,
      default: ''
    },
    
    // Social
    facebookUrl: {
      type: String,
      trim: true,
      default: ''
    },
    twitterUrl: {
      type: String,
      trim: true,
      default: ''
    },
    instagramUrl: {
      type: String,
      trim: true,
      default: ''
    },
    youtubeUrl: {
      type: String,
      trim: true,
      default: ''
    },
    linkedinUrl: {
      type: String,
      trim: true,
      default: ''
    },
    githubUrl: {
      type: String,
      trim: true,
      default: ''
    },
    
    // Contact
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
      default: ''
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ''
    },
    contactAddress: {
      type: String,
      trim: true,
      default: ''
    },
    
    // Time & Date
    timeZone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      default: 'MMM DD, YYYY'
    },
    timeFormat: {
      type: String,
      default: 'HH:mm'
    },
    
    // Custom Code
    customCss: {
      type: String,
      default: ''
    },
    customJs: {
      type: String,
      default: ''
    },
    customHead: {
      type: String,
      default: ''
    },
    customFooter: {
      type: String,
      default: ''
    },
    
    // Maintenance
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: {
      type: String,
      trim: true,
      default: 'We are currently performing maintenance. Please check back soon.'
    },
    
    // Features
    enableComments: {
      type: Boolean,
      default: true
    },
    enableGdpr: {
      type: Boolean,
      default: false
    },
    enableAnalytics: {
      type: Boolean,
      default: true
    },
    
    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
SettingSchema.index({ siteName: 1 });

// Pre-save middleware
SettingSchema.pre('save', function(next) {
  const setting = this as ISetting;
  
  // Ensure there's only one settings document
  Setting.countDocuments().then(count => {
    if (count > 0 && !setting.isNew) {
      // Allow update if existing
      next();
    } else if (count > 0 && setting.isNew) {
      // Prevent duplicate settings
      next(new Error('Only one settings document is allowed'));
    } else {
      next();
    }
  }).catch(next);
});

// Static method to get public settings
SettingSchema.statics.getPublic = function() {
  return this.findOne().select({
    siteName: 1,
    siteDescription: 1,
    siteLogo: 1,
    siteFavicon: 1,
    primaryColor: 1,
    secondaryColor: 1,
    footerText: 1,
    navigationMenu: 1,
    homePageLayout: 1,
    postsPerPage: 1,
    dateFormat: 1,
    timeFormat: 1,
    facebookUrl: 1,
    twitterUrl: 1,
    instagramUrl: 1,
    youtubeUrl: 1,
    linkedinUrl: 1,
    githubUrl: 1,
    contactEmail: 1,
    contactPhone: 1,
    contactAddress: 1,
    enableComments: 1,
    maintenanceMode: 1,
    maintenanceMessage: 1
  });
};

// Static method to get SEO settings
SettingSchema.statics.getSEO = function() {
  return this.findOne().select({
    siteName: 1,
    siteDescription: 1,
    siteUrl: 1,
    siteLogo: 1,
    siteFavicon: 1,
    analyticsId: 1,
    googleSiteVerification: 1,
    facebookPixelId: 1,
    twitterHandle: 1
  });
};

// Create and export model
const Setting = mongoose.model<ISetting>('Setting', SettingSchema);
export default Setting;