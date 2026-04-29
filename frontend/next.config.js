/** @type {import('next').NextConfig} */
const isBuild = process.env.npm_lifecycle_event === 'build';

const nextConfig = {
    swcMinify: false,
    eslint: { ignoreDuringBuilds: true },
    images: { unoptimized: true },
    trailingSlash: true,
    experimental: {
        cpus: 1,
        workerThreads: false
    }
};

if (isBuild) {
    nextConfig.output = 'export';
} else {
    // Apenas no ambiente local de desenvolvimento (npm run dev)
    nextConfig.rewrites = async () => {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:8000/api/:path*',
            },
        ]
    };
}

module.exports = nextConfig;