// backend/src/utils/createSlug.ts

// Create slug from text
export const createSlug = (text: string): string => {
  if (!text) return '';
  
  // Convert to lowercase
  let slug = text.toLowerCase().trim();
  
  // Remove accents
  slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace special characters with hyphens
  slug = slug
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove hyphens from start and end
  
  // If empty, generate from timestamp
  if (!slug) {
    slug = `item-${Date.now()}`;
  }
  
  return slug;
};

// Create slug with uniqueness check (async - for database integration)
export const createSlugWithUniqueness = async (
  text: string,
  model: any,
  field: string = 'slug',
  excludeId?: string
): Promise<string> => {
  let slug = createSlug(text);
  let uniqueSlug = slug;
  let counter = 1;
  let exists = true;
  
  while (exists) {
    const query: any = { [field]: uniqueSlug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const existing = await model.findOne(query);
    if (!existing) {
      exists = false;
    } else {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }
  
  return uniqueSlug;
};

// Generate multiple slug variants
export const generateSlugVariants = (text: string): string[] => {
  const variants: string[] = [];
  const base = createSlug(text);
  
  // Add base variant
  variants.push(base);
  
  // Add variants with different formats
  if (text.includes(' ')) {
    const words = text.split(' ');
    // First word
    variants.push(createSlug(words[0]));
    // First two words
    if (words.length >= 2) {
      variants.push(createSlug(words.slice(0, 2).join(' ')));
    }
    // Last two words
    if (words.length >= 2) {
      variants.push(createSlug(words.slice(-2).join(' ')));
    }
    // All words except last
    if (words.length >= 3) {
      variants.push(createSlug(words.slice(0, -1).join(' ')));
    }
    // All words except first
    if (words.length >= 3) {
      variants.push(createSlug(words.slice(1).join(' ')));
    }
  }
  
  // Remove duplicates
  return [...new Set(variants)];
};

// Check if slug is valid
export const isValidSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

// Check if slug is safe (not a reserved word)
export const isSlugSafe = (slug: string): boolean => {
  const reservedWords = [
    'admin', 'api', 'login', 'register', 'dashboard', 'settings',
    'profile', 'user', 'users', 'post', 'posts', 'page', 'pages',
    'category', 'categories', 'media', 'upload', 'download',
    'search', 'sitemap', 'robots', 'feed', 'rss', 'wp-admin',
    'wp-content', 'wp-includes', 'wp-json', 'graphql', 'api',
    'auth', 'oauth', 'signin', 'signup', 'logout'
  ];
  
  return !reservedWords.includes(slug.toLowerCase());
};

// Generate SEO-friendly URL
export const generateSeoUrl = (text: string, id?: string): string => {
  const slug = createSlug(text);
  return id ? `${slug}-${id}` : slug;
};

// Truncate slug to maximum length
export const truncateSlug = (slug: string, maxLength: number = 200): string => {
  if (slug.length <= maxLength) return slug;
  
  // Truncate at the last hyphen before maxLength
  const truncated = slug.substring(0, maxLength);
  const lastHyphen = truncated.lastIndexOf('-');
  
  return lastHyphen > 0 ? truncated.substring(0, lastHyphen) : truncated;
};

// Clean slug (remove common stop words)
export const cleanSlug = (text: string): string => {
  const stopWords = [
    'a', 'an', 'the', 'for', 'and', 'nor', 'but', 'or', 'yet', 'so',
    'as', 'at', 'by', 'for', 'from', 'in', 'into', 'near', 'of',
    'on', 'onto', 'to', 'with', 'without', 'via', 'vs', 'vs',
    'of', 'with', 'from', 'upon', 'under', 'over'
  ];
  
  let words = text.toLowerCase().split(' ');
  words = words.filter(word => !stopWords.includes(word));
  return createSlug(words.join(' '));
};

// Generate random slug
export const generateRandomSlug = (length: number = 8): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
};

// Batch create slugs for multiple items
export const batchCreateSlugs = async (
  items: Array<{ text: string; id?: string }>,
  model: any,
  field: string = 'slug'
): Promise<Map<string, string>> => {
  const slugMap = new Map<string, string>();
  
  for (const item of items) {
    const slug = await createSlugWithUniqueness(
      item.text,
      model,
      field,
      item.id
    );
    slugMap.set(item.id || item.text, slug);
  }
  
  return slugMap;
};

export default {
  createSlug,
  createSlugWithUniqueness,
  generateSlugVariants,
  isValidSlug,
  isSlugSafe,
  generateSeoUrl,
  truncateSlug,
  cleanSlug,
  generateRandomSlug,
  batchCreateSlugs
};