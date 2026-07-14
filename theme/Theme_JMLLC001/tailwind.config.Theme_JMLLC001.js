/**
 * Theme_JMLLC001 — Justice McNeal LLC official Tailwind config
 * Tokens from aiControl/websiteTheme.md
 *
 * Build:
 *   npm run build:tailwind:Theme_JMLLC001
 *
 * Legacy config remains at tailwind.config.js → css/tailwind.portal.css
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './index.html',
        './pages/portal/**/*.html',
        './admin/**/*.html',
        './pages/login/**/*.html',
        './pages/reset-password/**/*.html',
        './events/**/*.html',
        './public/**/*.html',
        './js/**/*.js',
        './test/**/*.html',
    ],
    theme: {
        extend: {
            colors: {
                /* Semantic tokens — match websiteTheme.md / theme/Theme_JMLLC001/Theme_JMLLC001.css */
                background: '#ffffff',
                foreground: '#0b2545',
                primary: {
                    DEFAULT: '#13366e',
                    hover: '#0f2d5c',
                    foreground: '#ffffff',
                    50: '#eef2f7',
                    100: '#dce4ef',
                    200: '#b9c9df',
                    300: '#7a98bf',
                    400: '#4a6f9a',
                    500: '#13366e',
                    600: '#0f2d5c',
                    700: '#0b2545',
                    800: '#081c35',
                    900: '#051325',
                },
                accent: {
                    DEFAULT: '#0e8b8b',
                    hover: '#0c7575',
                    foreground: '#ffffff',
                    soft: 'rgba(14, 139, 139, 0.12)',
                    50: '#ecfafa',
                    100: '#d1f5f5',
                    200: '#a7ebeb',
                    300: '#7de0e0',
                    400: '#53d6d6',
                    500: '#0e8b8b',
                    600: '#0c7575',
                    700: '#0a5f5f',
                    800: '#084949',
                    900: '#063333',
                },
                surface: {
                    DEFAULT: '#eef2f6',
                    foreground: '#0b2545',
                },
                border: {
                    DEFAULT: '#d5dfec',
                },
                muted: {
                    DEFAULT: '#3d5a7a',
                    foreground: '#0b2545',
                },
                logo: {
                    navy: '#0b2545',
                    blue: '#13366e',
                    teal: '#0e8b8b',
                },
            },
            fontFamily: {
                sans: ['"Atkinson Hyperlegible Next"', 'Arial', 'sans-serif'],
                body: ['"Atkinson Hyperlegible Next"', 'Arial', 'sans-serif'],
                headline: ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
            },
            letterSpacing: {
                headline: '-0.02em',
            },
            borderRadius: {
                card: '16px',
            },
            boxShadow: {
                card: '0 1px 2px rgba(11, 37, 69, 0.06)',
                'card-md': '0 4px 12px rgba(11, 37, 69, 0.08)',
                'card-lg': '0 12px 24px rgba(11, 37, 69, 0.1)',
            },
            ringColor: {
                focus: 'rgba(19, 54, 110, 0.35)',
            },
        },
    },
    plugins: [],
};
