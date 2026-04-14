/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose a Google client id to the browser when a developer sets
  // `google_client_id` in their environment. This keeps compatibility
  // with environments that named the variable `google_client_id` (lowercase).
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.google_client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  },
  images: {
    unoptimized: true,
    domains: [
      'ext.same-assets.com',
      'images.unsplash.com',
      'upload.wikimedia.org', // ✅ Add this line
    ],
  },
};

export default nextConfig;
