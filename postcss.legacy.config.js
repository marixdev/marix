module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-preset-env': {
      stage: 2,
      features: {
        'nesting-rules': true,
        'custom-properties': true,
        'custom-media-queries': true,
      },
      browsers: 'Chrome >= 108', // Electron 22 uses Chromium 108
    },
    'autoprefixer': {},
  },
}
