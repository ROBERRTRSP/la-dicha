import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: ["@prisma/client", "bcryptjs", "qrcode"],
};

export default nextConfig;
