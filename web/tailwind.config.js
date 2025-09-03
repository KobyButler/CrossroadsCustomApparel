/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./lib/**/*.{ts,tsx}"
    ],
    theme: {
        container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
        extend: {
            colors: {
                bg: "#f8fafc",        // light background
                card: "#ffffff",
                surface: "#f1f5f9",
                text: "#0f172a",
                muted: "#475569",
                accent: "#2563eb",
                accent2: "#16a34a",
                line: "rgba(0,0,0,0.08)"
            },
            borderRadius: { xl: "14px", "2xl": "20px" },
            boxShadow: {
                soft: "0 2px 12px rgba(0,0,0,0.08)",
                ring: "0 0 0 1px rgba(37,99,235,0.55), 0 8px 24px rgba(37,99,235,0.16)"
            }
        }
    },
    plugins: []
};
