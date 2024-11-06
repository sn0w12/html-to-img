import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Ignore source map loading errors from chrome-aws-lambda
    config.resolve.alias["chrome-aws-lambda$"] = "chrome-aws-lambda/handler.js";

    // Prevent source map loading issues
    config.module.rules.push({
      test: /\.js.map$/,
      enforce: "pre",
      use: ["source-map-loader"],
    });

    return config;
  },
};

module.exports = nextConfig;

export default nextConfig;
