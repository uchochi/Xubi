import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',      // This enables the static export
  images: {
    unoptimized: true,   // Required because GitHub Pages doesn't support Next.js image optimization
  },
  // If your repository name is NOT "username.github.io" (e.g., it's "my-project"), 
  // you might need to add:
  // basePath: '/my-project', 
};

export default nextConfig;
