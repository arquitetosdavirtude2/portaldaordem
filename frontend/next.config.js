/** @type {import('next').NextConfig} */
const nextConfig = { swcMinify: false, eslint: { ignoreDuringBuilds: true }, output: 'export', images: { unoptimized: true }, trailingSlash: true };
module.exports = nextConfig;