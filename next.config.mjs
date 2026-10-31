const isProd = process.env.NODE_ENV === 'production';
const isTauriBuild = process.env.TAURI_BUILD === 'true';

const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the development server dynamic so Better Auth can handle POST requests.
  // The desktop bundle needs static files; Vercel needs a server build for API routes.
  output: isTauriBuild ? 'export' : undefined,
  // Note: This feature is required to use the Next.js Image component in SSG mode.
  // See https://nextjs.org/docs/messages/export-image-api for different workarounds.
  images: {
    unoptimized: true,
  },
  // Configure assetPrefix or else the server won't properly resolve your assets.
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
};

export default nextConfig;
