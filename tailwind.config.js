/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './public/**/*.{html,js}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border, 0 0% 20%))",
        input: "hsl(var(--input, 0 0% 20%))",
        ring: "hsl(var(--ring, 0 0% 80%))",
        background: "hsl(var(--background, 0 0% 6%))",
        foreground: "hsl(var(--foreground, 0 0% 98%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 0 0% 98%))",
          foreground: "hsl(var(--primary-foreground, 0 0% 9%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 0 0% 15%))",
          foreground: "hsl(var(--secondary-foreground, 0 0% 98%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 62.8% 30.6%))",
          foreground: "hsl(var(--destructive-foreground, 0 0% 98%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 0 0% 15%))",
          foreground: "hsl(var(--muted-foreground, 0 0% 63.9%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 0 0% 15%))",
          foreground: "hsl(var(--accent-foreground, 0 0% 98%))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover, 0 0% 6%))",
          foreground: "hsl(var(--popover-foreground, 0 0% 98%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 0 0% 6%))",
          foreground: "hsl(var(--card-foreground, 0 0% 98%))",
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
    },
  },
  plugins: [],
};
