/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,

  async redirects() {
    return [
      // A short address for the printed hand-out. Keeping the QR's payload
      // down to "https://mevratek.ru/pdf" is what lets it stay a sparse
      // 25-module code that scans instantly off paper and off a screen.
      {
        source: "/pdf",
        destination: "/mevratek-platform.pdf",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
