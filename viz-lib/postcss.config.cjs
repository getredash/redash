const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

module.exports = {
    plugins: [tailwindcss('./tailwind.config.cjs'), autoprefixer],
};