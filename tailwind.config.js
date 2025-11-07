/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "primary": "#8F8F8F",
        "midnight-black": "#0b0e0f",
      },
      fontFamily: {
          'primary-regular': ['Poppins_400Regular'],
          'primary-medium': ['Poppins_500Medium'],
          'primary-semibold': ['Poppins_600SemiBold'],
          'primary-bold': ['Poppins_700Bold'],
      },
    },
  },
  plugins: [],
}