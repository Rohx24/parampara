/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fredoka", "system-ui", "sans-serif"],
        body: ["Nunito", "system-ui", "sans-serif"],
      },
      colors: {
        buddy: {
          peach: "#FFD6C9",
          sky: "#CBE9FF",
          mint: "#D7F8E6",
          grape: "#7B6CF6",
          coral: "#FF7D6B",
          cocoa: "#4A3B36",
        },
      },
      boxShadow: {
        soft: "0 20px 60px -40px rgba(30, 41, 59, 0.55)",
        card: "0 18px 45px -30px rgba(15, 23, 42, 0.45)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        floaty: "floaty 5s ease-in-out infinite",
        shimmer: "shimmer 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
