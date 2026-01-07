/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
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
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-outfit)", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: 'hsl(var(--primary) / 0.05)',
          100: 'hsl(var(--primary) / 0.1)',
          200: 'hsl(var(--primary) / 0.2)',
          300: 'hsl(var(--primary) / 0.3)',
          400: 'hsl(var(--primary) / 0.4)',
          500: 'hsl(var(--primary) / 0.5)',
          600: 'hsl(var(--primary) / 0.6)',
          700: 'hsl(var(--primary) / 0.7)',
          800: 'hsl(var(--primary) / 0.8)',
          900: 'hsl(var(--primary) / 0.9)',
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          50: 'hsl(var(--secondary) / 0.05)',
          100: 'hsl(var(--secondary) / 0.1)',
          200: 'hsl(var(--secondary) / 0.2)',
          300: 'hsl(var(--secondary) / 0.3)',
          400: 'hsl(var(--secondary) / 0.4)',
          500: 'hsl(var(--secondary) / 0.5)',
          600: 'hsl(var(--secondary) / 0.6)',
          700: 'hsl(var(--secondary) / 0.7)',
          800: 'hsl(var(--secondary) / 0.8)',
          900: 'hsl(var(--secondary) / 0.9)',
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}