/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', // Gera pasta out/ com HTML/CSS/JS estático para cPanel
    swcMinify: false, // Force disable SWC minification
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack: (config) => {
        // Tailwind v4 gera CSS nesting com '&' seletores. O css-loader do webpack
        // tenta resolver './&' como módulo e falha. Desabilitamos a resolução de URL
        // no css-loader para evitar esse problema.
        config.module.rules.forEach((rule) => {
            if (rule.oneOf) {
                rule.oneOf.forEach((r) => {
                    if (Array.isArray(r.use)) {
                        r.use.forEach((u) => {
                            if (u && u.loader && u.loader.includes('css-loader') && u.options) {
                                u.options.url = false;
                            }
                        });
                    }
                });
            }
        });
        return config;
    },
};

module.exports = nextConfig;
