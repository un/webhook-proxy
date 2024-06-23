/** @type {import('prettier').Config} */
const config = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  singleQuote: false,
  plugins: ["prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],
};

export default config;
