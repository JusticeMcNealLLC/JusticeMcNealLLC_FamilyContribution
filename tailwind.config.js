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
        './react/**/*.{ts,tsx}',
        './test/**/*.html',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                surface: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                },
                // Theme_JMLLC001 tokens, prefixed so legacy pages' primary/accent classes stay untouched
                jm: {
                    navy: '#0b2545',
                    primary: '#13366e',
                    'primary-hover': '#0f2d5c',
                    accent: '#0e8b8b',
                    'accent-hover': '#0c7575',
                    'accent-soft': 'rgba(14, 139, 139, 0.12)',
                    surface: '#eef2f6',
                    border: '#d5dfec',
                    muted: '#3d5a7a',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                'jm-headline': ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
                'jm-body': ['"Atkinson Hyperlegible Next"', 'Arial', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
