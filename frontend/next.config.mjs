/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server bundle for small Docker images.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
