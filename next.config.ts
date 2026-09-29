import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // CLAUDE.md is hand-maintained; stop `next dev` appending its agent block.
  agentRules: false,
  // A package-lock.json in the parent folder would otherwise be picked as the workspace root.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
