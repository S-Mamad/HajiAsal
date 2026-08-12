import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ensure mysql2 (and natives) are always traced into the host pack
  outputFileTracingIncludes: {
    "/*": ["./node_modules/mysql2/**/*"],
  },
  serverExternalPackages: ["mysql2"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    qualities: [75, 82],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Prefer ESM "import" so Phosphor `/dist/ssr` does not resolve via the
  // broken `require` export to the client CJS bundle (createContext crash).
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.conditionNames = [
      "import",
      "module",
      "require",
      "default",
      ...(config.resolve.conditionNames ?? []),
    ];
    return config;
  },
};

export default nextConfig;
