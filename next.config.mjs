const isProd = process.env.NODE_ENV === 'production';
const isTauriBuild = process.env.TAURI_BUILD === 'true';

const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The static Tauri build removes request-time routes; stale development
  // validators must not re-import those removed routes during type checking.
  ...(isTauriBuild ? { typescript: { tsconfigPath: "tsconfig.tauri.json" } } : {}),
  // The desktop bundle needs static files.
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
