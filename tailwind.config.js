module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#F9FCFF',
        ink: '#081F5C',
        primary: '#334EAC',
        muted: '#4E6593',
        ice: '#E7F1FF',
        sky: '#7096D1',
        border: '#D0E3FF',
        sage: '#E8EFE7',
      },
    },
  },
  plugins: [],
};
