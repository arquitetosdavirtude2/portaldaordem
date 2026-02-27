/** @type {import('next').NextConfig} */
const isBuild = process.env.npm_lifecycle_event === 'build';

const nextConfig = {
    swcMinify: false,
    eslint: { ignoreDuringBuilds: true },
    images: { unoptimized: true },
    trailingSlash: true
};

if (isBuild) {
    nextConfig.output = 'export';
} else {
    // Apenas no ambiente local de desenvolvimento (npm run dev)
    nextConfig.rewrites = async () => {
        return [
            {
                source: '/api/:path*',
                destination: 'http://127.0.0.1:8000/api/:path*',
            },
        ]
    };
}

module.exports = nextConfig;