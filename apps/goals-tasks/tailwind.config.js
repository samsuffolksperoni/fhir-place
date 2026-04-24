/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/react-fhir/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
