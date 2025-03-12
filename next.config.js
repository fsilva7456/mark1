/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
}

module.exports = nextConfig 