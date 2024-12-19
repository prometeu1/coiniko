/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Utilise le mode basé sur une classe (e.g., 'dark')
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)", // Utilise une variable CSS pour la couleur
        foreground: "var(--foreground)", // Variable CSS pour le texte
      },
    },
  },
  plugins: [],
};

