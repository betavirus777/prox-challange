import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@anthropic-ai/sdk", "@lancedb/lancedb", "openai"],
  outputFileTracingIncludes: {
    "/api/chat": ["./data/lancedb/**/*", "./knowledge/**/*"],
  },
  outputFileTracingExcludes: {
    "/api/**/*": [
      "./node_modules/@lancedb/lancedb-linux-x64-musl/**/*",
      "./files/**/*",
    ],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
