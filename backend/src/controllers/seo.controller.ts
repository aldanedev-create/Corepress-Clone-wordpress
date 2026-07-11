// backend/src/controllers/seo.controller.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Post from '../models/Post';
import Page from '../models/Page';
import Setting from '../models/Setting';
import { apiResponse } from '../utils/apiResponse';
import { ActivityLogService } from '../services/activity.service';
import { PYTHON_SERVICE_URL } from '../config/env';
import axios from 'axios';

// Types
interface SEOAnalysis {
  title: string;
  description: string;
  keywords: string[];
  score: number;
  suggestions: string[];
  readability: {
    score: number;
    level: string;
  };
  metaTags: {
    title: string;
    description: string;
    keywords: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterCard: string;
  };
}

// Analyze SEO for content
export const analyzeSEO = async (req: Request, res: Response): Promise<Response> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.error(res, 'Validation error', 400, errors.array());
    }

    const { content, title, keywords } = req.body;

    if (!content || !title) {
      return apiResponse.error(res, 'Content and title are required', 400);
    }

    let seoAnalysis: SEOAnalysis;

    try {
      // Call Python service for SEO analysis
      const response = await axios.post(`${PYTHON_SERVICE_URL}/seo/analyze`, {
        content,
        title,
        keywords: keywords || []
      });

      seoAnalysis = response.data;
    } catch (error) {
      console.error('Python service error:', error);
      
      // Fallback: Basic SEO analysis
      seoAnalysis = {
        title,
        description: content.substring(0, 160).replace(/<[^>]*>/g, ''),
        keywords: keywords || [],
        score: 0,
        suggestions: ['Consider using a Python service for better SEO analysis'],
        readability: {
          score: 0,
          level: 'Unknown'
        },
        metaTags: {
          title,
          description: content.substring(0, 160).replace(/<[^>]*>/g, ''),
          keywords: (keywords || []).join(', '),
          ogTitle: title,
          ogDescription: content.substring(0, 160).replace(/<[^>]*>/g, ''),
          ogImage: '',
          twitterCard: 'summary_large_image'
        }
      };
    }

    return apiResponse.success(res, 'SEO analysis completed', seoAnalysis);
  } catch (error) {
    console.error('SEO analysis error:', error);
    return apiResponse.error(res, 'Failed to analyze SEO', 500);
  }
};

// Generate SEO metadata for post
export const generatePostSEO = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return apiResponse.error(res, 'Post not found', 404);
    }

    // Generate SEO metadata
    const seoData = {
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || post.excerpt || post.content.substring(0, 160).replace(/<[^>]*>/g, ''),
      ogImage: post.featuredImage || '',
      ogTitle: post.seoTitle || post.title,
      ogDescription: post.seoDescription || post.excerpt || post.content.substring(0, 160).replace(/<[^>]*>/g, ''),
      twitterCard: 'summary_large_image',
      canonicalUrl: `/blog/${post.slug}`,
      metaRobots: 'index, follow'
    };

    // Update post with SEO data if not already set
    if (!post.seoTitle || !post.seoDescription) {
      post.seoTitle = seoData.seoTitle;
      post.seoDescription = seoData.seoDescription;
      await post.save();
    }

    return apiResponse.success(res, 'SEO metadata generated', seoData);
  } catch (error) {
    console.error('Generate post SEO error:', error);
    return apiResponse.error(res, 'Failed to generate SEO metadata', 500);
  }
};

// Generate sitemap
export const generateSitemap = async (req: Request, res: Response): Promise<Response> => {
  try {
    const baseUrl = req.protocol + '://' + req.get('host');

    // Get all published posts
    const posts = await Post.find({ status: 'published' })
      .select('slug updatedAt')
      .lean();

    // Get all published pages
    const pages = await Page.find({ status: 'published' })
      .select('slug updatedAt')
      .lean();

    // Get settings
    const settings = await Setting.findOne();
    const siteUrl = settings?.siteName || baseUrl;

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add homepage
    sitemap += `
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>1.0</priority>
  </url>`;

    // Add blog page
    sitemap += `
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>0.9</priority>
  </url>`;

    // Add posts
    for (const post of posts) {
      sitemap += `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
    <priority>0.8</priority>
  </url>`;
    }

    // Add pages
    for (const page of pages) {
      sitemap += `
  <url>
    <loc>${baseUrl}/${page.slug}</loc>
    <lastmod>${page.updatedAt.toISOString()}</lastmod>
    <priority>0.7</priority>
  </url>`;
    }

    sitemap += `
</urlset>`;

    // Log activity
    if (req.user) {
      await ActivityLogService.log({
        userId: req.user.id,
        action: 'SITEMAP_GENERATE',
        details: `User ${req.user.email} generated sitemap`,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });
    }

    return res
      .status(200)
      .header('Content-Type', 'application/xml')
      .send(sitemap);
  } catch (error) {
    console.error('Generate sitemap error:', error);
    return apiResponse.error(res, 'Failed to generate sitemap', 500);
  }
};

// Generate robots.txt
export const generateRobotsTxt = async (req: Request, res: Response): Promise<Response> => {
  try {
    const baseUrl = req.protocol + '://' + req.get('host');
    const isProduction = process.env.NODE_ENV === 'production';

    let robots = `# Robots.txt for CorePress CMS
User-agent: *
Allow: /`;

    if (isProduction) {
      robots += `
Sitemap: ${baseUrl}/sitemap.xml`;
    } else {
      robots += `
Disallow: /
# Development environment - blocking all robots`;
    }

    return res
      .status(200)
      .header('Content-Type', 'text/plain')
      .send(robots);
  } catch (error) {
    console.error('Generate robots.txt error:', error);
    return apiResponse.error(res, 'Failed to generate robots.txt', 500);
  }
};

// Validate SEO metadata
export const validateSEO = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { seoTitle, seoDescription, keywords } = req.body;

    const issues: string[] = [];
    const warnings: string[] = [];

    // Validate title
    if (!seoTitle) {
      issues.push('SEO title is required');
    } else if (seoTitle.length < 30) {
      warnings.push('SEO title is too short. Recommended length: 30-60 characters');
    } else if (seoTitle.length > 60) {
      warnings.push('SEO title is too long. Recommended length: 30-60 characters');
    }

    // Validate description
    if (!seoDescription) {
      issues.push('SEO description is required');
    } else if (seoDescription.length < 120) {
      warnings.push('SEO description is too short. Recommended length: 120-160 characters');
    } else if (seoDescription.length > 160) {
      warnings.push('SEO description is too long. Recommended length: 120-160 characters');
    }

    // Validate keywords
    if (keywords && keywords.length > 0) {
      if (keywords.length > 10) {
        warnings.push('Too many keywords. Recommended: 5-10 keywords');
      }
      for (const keyword of keywords) {
        if (keyword.length > 40) {
          warnings.push(`Keyword "${keyword}" is too long. Recommended: under 40 characters`);
        }
      }
    } else {
      warnings.push('No keywords provided. Consider adding relevant keywords');
    }

    return apiResponse.success(res, 'SEO validation completed', {
      isValid: issues.length === 0,
      issues,
      warnings,
      score: issues.length === 0 ? (warnings.length === 0 ? 100 : 75) : 50
    });
  } catch (error) {
    console.error('Validate SEO error:', error);
    return apiResponse.error(res, 'Failed to validate SEO', 500);
  }
};