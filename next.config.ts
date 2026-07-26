import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Placeholder photography for the design build. Same seed always resolves
    // to the same photograph, so crops stay consistent across breakpoints.
    remotePatterns: [{ protocol: "https", hostname: "picsum.photos" }],
  },
};

export default nextConfig;
