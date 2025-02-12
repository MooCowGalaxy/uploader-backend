module.exports = {
  darkMode: 'class',
  content: [
      './templates/*.ejs',
      './templates/models/*.ejs',
      './static/js/*.js'
  ],
  theme: {
    extend: {},
  },
  plugins: [
      require('tw-elements/dist/plugin')
  ],
}
