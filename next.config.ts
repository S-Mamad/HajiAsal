import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ensure mysql2 (and natives) are always traced into the host pack
  outputFileTracingIncludes: {
    "/*": ["./node_modules/mysql2/**/*"],
  },
  serverExternalPackages: ["mysql2"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
