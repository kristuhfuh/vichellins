import type { NextConfig } from "next";

// Allow next/image to serve product photos from the configured Supabase project.
// Works for hosted projects (*.supabase.co) and the local Docker stack alike.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePattern = supabaseUrl
  ? (() => {
      try {
        const u = new URL(supabaseUrl);
        return {
          protocol: u.protocol.replace(":", "") as "http" | "https",
          hostname: u.hostname,
          port: u.port || undefined,
          pathname: "/storage/v1/object/public/**",
        };
      } catch {
        return null;
      }
    })()
  : null;

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    remotePatterns: supabasePattern ? [supabasePattern] : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
