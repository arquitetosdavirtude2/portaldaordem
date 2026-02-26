/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: false, // Force disable SWC minification
    eslint: {
        ignoreDuringBuilds: true,
    },
    output: 'export',
    images: {
        unoptimized: true,
    },
};

module.exports = nextConfig;
