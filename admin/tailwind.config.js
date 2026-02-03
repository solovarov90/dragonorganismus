/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#09090b', // Zinc 950
                surface: '#18181b',    // Zinc 900
                primary: '#10b981',    // Emerald 500 (Neon Greenish)
                'primary-glow': '#059669', // Emerald 600
                secondary: '#3b82f6',  // Blue 500
                accent: '#8b5cf6',     // Violet 500
                text: '#e4e4e7',       // Zinc 200
                'text-muted': '#a1a1aa', // Zinc 400
                border: '#27272a',     // Zinc 800
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'], // For that "digital" feel
            },
            boxShadow: {
                'neon': '0 0 10px rgba(16, 185, 129, 0.5)',
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
            }
        },
    },
    plugins: [],
}
