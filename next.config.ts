import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@anthropic-ai/sdk", "@lancedb/lancedb", "openai"],
  outputFileTracingIncludes: {
    "/api/chat": ["./data/lancedb/**/*", "./knowledge/**/*"],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
