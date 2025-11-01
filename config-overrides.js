// config-overrides.js
const webpack = require('webpack');

module.exports = function override(config) {
  
  // Add the polyfills for Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback, // ...keep any existing fallbacks
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer"),
  };

  // Add the Buffer plugin
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ]);

  return config;
};