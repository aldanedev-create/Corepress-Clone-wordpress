// backend/src/services/slug.service.ts
import Post from '../models/Post';
import Page from '../models/Page';
import Category from '../models/Category';

// Slug service interface
export interface ISlugService {
  generateSlug(text: string): string;
  makeSlugUnique(slug: string, model: 'Post' | 'Page' | 'Category', excludeId?: string): Promise<string>;
  isValidSlug(slug: string): boolean;
  normalizeString(text: string): string;
  slugify(text: string): string;
}

// Slug service implementation
class SlugService implements ISlugService {
  private static instance: SlugService;

  private constructor() {}

  public static getInstance(): SlugService {
    if (!SlugService.instance) {
      SlugService.instance = new SlugService();
    }
    return SlugService.instance;
  }

  // Generate slug from text
  generateSlug(text: string): string {
    return this.slugify(text);
  }

  // Make slug unique by checking database
  async makeSlugUnique(
    slug: string,
    model: 'Post' | 'Page' | 'Category',
    excludeId?: string
  ): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;
    let exists = true;

    while (exists) {
      // Check if slug exists in the specified model
      let found = false;

      switch (model) {
        case 'Post':
          const post = await Post.findOne({
            slug: uniqueSlug,
            _id: { $ne: excludeId }
          });
          found = !!post;
          break;
        case 'Page':
          const page = await Page.findOne({
            slug: uniqueSlug,
            _id: { $ne: excludeId }
          });
          found = !!page;
          break;
        case 'Category':
          const category = await Category.findOne({
            slug: uniqueSlug,
            _id: { $ne: excludeId }
          });
          found = !!category;
          break;
      }

      if (!found) {
        exists = false;
      } else {
        // Append counter to slug
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
    }

    return uniqueSlug;
  }

  // Validate slug format
  isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  }

  // Normalize string (remove accents, special characters)
  normalizeString(text: string): string {
    // Remove accents
    const normalized = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    return normalized;
  }

  // Slugify text
  slugify(text: string): string {
    if (!text) return '';

    // Normalize and convert to lowercase
    let slug = this.normalizeString(text);

    // Replace spaces and special characters with hyphens
    slug = slug
      .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Remove hyphens from start and end

    // If empty after sanitization, generate from timestamp
    if (!slug) {
      slug = `item-${Date.now()}`;
    }

    return slug;
  }

  // Generate SEO-friendly URL
  generateSeoUrl(text: string, id?: string): string {
    const slug = this.slugify(text);
    return id ? `${slug}-${id}` : slug;
  }

  // Check if slug is safe for URL
  isSlugSafe(slug: string): boolean {
    const unsafePatterns = [
      /^admin$/i,
      /^api$/i,
      /^login$/i,
      /^register$/i,
      /^dashboard$/i,
      /^settings$/i,
      /^profile$/i,
      /^user$/i,
      /^users$/i,
      /^post$/i,
      /^posts$/i,
      /^page$/i,
      /^pages$/i,
      /^category$/i,
      /^categories$/i,
      /^media$/i,
      /^upload$/i,
      /^download$/i,
      /^search$/i,
      /^sitemap$/i,
      /^robots$/i,
      /^feed$/i,
      /^rss$/i
    ];

    return !unsafePatterns.some(pattern => pattern.test(slug));
  }

  // Generate multiple slug variants
  generateSlugVariants(text: string): string[] {
    const variants: string[] = [];
    const base = this.slugify(text);

    // Add base variant
    variants.push(base);

    // Add variants with different formats
    if (text.includes(' ')) {
      const words = text.split(' ');
      // First word
      variants.push(this.slugify(words[0]));
      // First two words
      if (words.length >= 2) {
        variants.push(this.slugify(words.slice(0, 2).join(' ')));
      }
      // Last two words
      if (words.length >= 2) {
        variants.push(this.slugify(words.slice(-2).join(' ')));
      }
    }

    // Remove duplicates
    return [...new Set(variants)];
  }

  // Generate random slug
  generateRandomSlug(length: number = 8): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
}

// Export singleton instance
export const slugService = SlugService.getInstance();
export default slugService;