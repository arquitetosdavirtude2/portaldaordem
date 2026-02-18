import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                masonic: {
                    gold: '#D4AF37',
                    blue: '#0B132B',
                    red: '#8B0000',
                    black: '#121212',
                    'gold-light': '#F4D03F',
                    'blue-light': '#1C2E4A',
                }
            },
            fontFamily: {
                serif: ['var(--font-cinzel)', 'serif'],
                sans: ['var(--font-inter)', 'sans-serif'],
            },
            backgroundImage: {
                'masonic-gradient': 'radial-gradient(circle at center, #1C2E4A 0%, #0B132B 100%)',
            }
        },
    },
    plugins: [],
};

export default config;
