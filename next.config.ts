import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker uchun standalone chiqish (Dockerfile shunga tayanadi)
  output: "standalone",
  serverExternalPackages: ["xlsx", "bcryptjs"],
};

export default nextConfig;
