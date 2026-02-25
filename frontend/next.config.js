/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', // Gera pasta out/ com HTML/CSS/JS estático para cPanel
    swcMinify: false, // Force disable SWC minification
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
};

module.exports = nextConfig;
