/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Food photos are sent to the server action/route as base64; allow a sane ceiling.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
