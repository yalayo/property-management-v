module.exports = {
    content: [
      './public/*.html',
      './public/**/*.cljs',        // <- important if you're using re-frame/CLJS!
      './public/**/*.cljc',
      './public/**/*.css',
      './public/**/*.js'
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }