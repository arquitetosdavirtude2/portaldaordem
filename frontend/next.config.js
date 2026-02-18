/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: false, // Force disable SWC minification
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    experimental: {
        workerThreads: false,
        cpus: 1,
    },
};

module.exports = nextConfig;
