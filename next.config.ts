import type { NextConfig } from "next";
import { execSync } from "child_process";

let commitHash = "dev";
try {
  commitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (e) {
  console.warn("Could not get git commit hash", e);
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: commitHash,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

// Only wrap with Sentry if DSN is configured and package is installed
let configWithSentry = nextConfig;
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  try {
    const { withSentryConfig } = require("@sentry/nextjs");
    configWithSentry = withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options

      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Only upload source maps in production
      silent: !process.env.SENTRY_AUTH_TOKEN,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    });
  } catch (e) {
    // Sentry package not installed, use default config
    console.warn("Sentry package not found. Install @sentry/nextjs to enable error tracking.");
  }
}

export default configWithSentry;
