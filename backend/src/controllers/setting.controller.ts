// backend/src/controllers/setting.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Setting from '../models/Setting';
import { apiResponse } from '../utils/apiResponse';
import { ActivityLogService } from '../services/activity.service';

// Types
interface SettingUpdate {
  siteName?: string;
  siteDescription?: string;
  siteLogo?: string;
  siteFavicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footerText?: string;
  navigationMenu?: any[];
  homePageLayout?: string;
  postsPerPage?: number;
  timeZone?: string;
  dateFormat?: string;
  timeFormat?: string;
  analyticsId?: string;
  googleSiteVerification?: string;
  customCss?: string;
  customJs?: string;
}

// Get settings
export const getSettings = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Get settings or create default
    let settings = await Setting.findOne();
    
    if (!settings) {
      // Create default settings
      settings = await Setting.create({
        siteName: 'CorePress CMS',
        siteDescription: 'A modern content management system',
        siteLogo: '',
        siteFavicon: '',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        footerText: `© ${new Date().getFullYear()} CorePress CMS. All rights reserved.`,
        navigationMenu: [
          { id: 'home', label: 'Home', url: '/', order: 0 },
          { id: 'blog', label: 'Blog', url: '/blog', order: 1 },
          { id: 'about', label: 'About', url: '/about', order: 2 },
          { id: 'contact', label: 'Contact', url: '/contact', order: 3 }
        ],
        homePageLayout: 'grid',
        postsPerPage: 10,
        timeZone: 'UTC',
        dateFormat: 'MMM DD, YYYY',
        timeFormat: 'HH:mm',
        analyticsId: '',
        googleSiteVerification: '',
        customCss: '',
        customJs: '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // For public, return limited settings
    const isPublic = !req.user;
    if (isPublic) {
      const publicSettings = {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        siteLogo: settings.siteLogo,
        siteFavicon: settings.siteFavicon,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        footerText: settings.footerText,
        navigationMenu: settings.navigationMenu,
        homePageLayout: settings.homePageLayout,
        postsPerPage: settings.postsPerPage,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat
      };
      return apiResponse.success(res, 'Settings retrieved successfully', publicSettings);
    }

    return apiResponse.success(res, 'Settings retrieved successfully', settings);
  } catch (error) {
    console.error('Get settings error:', error);
    return apiResponse.error(res, 'Failed to retrieve settings', 500);
  }
};

// Update settings
export const updateSettings = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Check permission
    if (!['admin', 'super_admin'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to update settings', 403);
    }

    const settingsData: SettingUpdate = req.body;

    // Get settings
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        siteName: 'CorePress CMS',
        siteDescription: 'A modern content management system',
        // ... other defaults
      });
    }

    // Update settings
    const updatedSettings = await Setting.findByIdAndUpdate(
      settings._id,
      {
        ...settingsData,
        updatedAt: new Date()
      },
      { new: true }
    );

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'SETTINGS_UPDATE',
      details: `User ${user.email} updated site settings`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Settings updated successfully', updatedSettings);
  } catch (error) {
    console.error('Update settings error:', error);
    return apiResponse.error(res, 'Failed to update settings', 500);
  }
};

// Reset settings to default
export const resetSettings = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Check permission
    if (!['admin', 'super_admin'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to reset settings', 403);
    }

    // Reset to default
    const defaultSettings = {
      siteName: 'CorePress CMS',
      siteDescription: 'A modern content management system',
      siteLogo: '',
      siteFavicon: '',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      footerText: `© ${new Date().getFullYear()} CorePress CMS. All rights reserved.`,
      navigationMenu: [
        { id: 'home', label: 'Home', url: '/', order: 0 },
        { id: 'blog', label: 'Blog', url: '/blog', order: 1 },
        { id: 'about', label: 'About', url: '/about', order: 2 },
        { id: 'contact', label: 'Contact', url: '/contact', order: 3 }
      ],
      homePageLayout: 'grid',
      postsPerPage: 10,
      timeZone: 'UTC',
      dateFormat: 'MMM DD, YYYY',
      timeFormat: 'HH:mm',
      analyticsId: '',
      googleSiteVerification: '',
      customCss: '',
      customJs: '',
      updatedAt: new Date()
    };

    const settings = await Setting.findOneAndUpdate(
      {},
      defaultSettings,
      { new: true, upsert: true }
    );

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'SETTINGS_RESET',
      details: `User ${user.email} reset site settings to default`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Settings reset to default successfully', settings);
  } catch (error) {
    console.error('Reset settings error:', error);
    return apiResponse.error(res, 'Failed to reset settings', 500);
  }
};

// Get navigation menu
export const getNavigation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const settings = await Setting.findOne();
    if (!settings) {
      return apiResponse.success(res, 'Navigation menu retrieved', { navigation: [] });
    }

    return apiResponse.success(res, 'Navigation menu retrieved', {
      navigation: settings.navigationMenu || []
    });
  } catch (error) {
    console.error('Get navigation error:', error);
    return apiResponse.error(res, 'Failed to retrieve navigation', 500);
  }
};

// Update navigation menu
export const updateNavigation = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user;
    if (!user) {
      return apiResponse.error(res, 'User not authenticated', 401);
    }

    // Check permission
    if (!['admin', 'super_admin'].includes(user.role)) {
      return apiResponse.error(res, 'You do not have permission to update navigation', 403);
    }

    const { navigation } = req.body;

    if (!Array.isArray(navigation)) {
      return apiResponse.error(res, 'Navigation must be an array', 400);
    }

    // Validate navigation items
    for (const item of navigation) {
      if (!item.label || !item.url) {
        return apiResponse.error(res, 'Each navigation item must have label and url', 400);
      }
    }

    const settings = await Setting.findOneAndUpdate(
      {},
      { 
        navigationMenu: navigation,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    // Log activity
    await ActivityLogService.log({
      userId: user.id,
      action: 'NAVIGATION_UPDATE',
      details: `User ${user.email} updated navigation menu`,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    return apiResponse.success(res, 'Navigation menu updated successfully', {
      navigation: settings.navigationMenu
    });
  } catch (error) {
    console.error('Update navigation error:', error);
    return apiResponse.error(res, 'Failed to update navigation', 500);
  }
};