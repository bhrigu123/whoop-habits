import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client-side cache for visited pages: revisiting the board or a habit
    // detail within 30s renders instantly from cache instead of refetching.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
