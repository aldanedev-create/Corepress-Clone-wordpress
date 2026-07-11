// admin/src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ENV: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_FB_PIXEL_ID?: string;
  readonly VITE_CLARITY_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_PWA?: string;
  readonly VITE_MAX_FILE_SIZE?: string;
  readonly VITE_ALLOWED_FILE_TYPES?: string;
  readonly VITE_SITE_NAME?: string;
  readonly VITE_SITE_DESCRIPTION?: string;
  readonly VITE_DEFAULT_THEME?: 'light' | 'dark';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global declarations
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

// Declare module for CSS modules
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Declare module for images
declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

// Declare module for fonts
declare module '*.woff' {
  const content: string;
  export default content;
}

declare module '*.woff2' {
  const content: string;
  export default content;
}

// Declare module for JSON files
declare module '*.json' {
  const value: any;
  export default value;
}