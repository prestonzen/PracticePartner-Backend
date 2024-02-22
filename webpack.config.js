// webpack.config.js

const path = require('path');

module.exports = {
  entry: './src/app.js', // Update with your actual entry file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'), // Update with your desired output directory
  },
  resolve: {
    fallback: {
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "assert": require.resolve("assert/"),
        "net": false,
        "tls": false,
        "crypto": false,
        "zlib": false,
        "querystring": require.resolve("querystring-es3"),
        "fs": false,
        "path": require.resolve("path-browserify")
    },
},
  mode: 'development', // or 'production'
};
