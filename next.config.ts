import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // @ts-ignore - Turbopack type definition might catch up later
    turbopack: {
        rules: {
            "*.svg": {
                loaders: ["@svgr/webpack"],
                as: "*.js",
            },
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "flagcdn.com",
            },
        ],
    },
};

export default nextConfig;
