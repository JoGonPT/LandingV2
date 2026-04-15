import type { Config } from "tailwindcss";

export default {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                gold: {
                    DEFAULT: '#D4AF37',
                    light: '#E6C865',
                    dark: '#AA8C2C',
                },
                dark: {
                    DEFAULT: '#050816',
                },
                light: {
                    DEFAULT: '#FBFBFB',
                }
            },
        },
    },
    plugins: [],
} satisfies Config;
