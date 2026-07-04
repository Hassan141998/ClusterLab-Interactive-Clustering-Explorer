/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // When NEXT_PUBLIC_API_URL is empty, calls go to same origin (/api/...)
  // When running locally against FastAPI, set it to http://localhost:8000
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
  },
};
module.exports = nextConfig;
