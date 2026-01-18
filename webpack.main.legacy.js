const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/main/index.ts',
  target: 'electron-main',
  devtool: false,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.main.json',
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/main'),
    libraryTarget: 'commonjs2',
  },
  externals: {
    // Keep native modules external - they can't be bundled
    'ssh2': 'commonjs2 ssh2',
    'cpu-features': 'commonjs2 cpu-features',
    'node-pty': 'commonjs2 node-pty',
    'argon2': 'commonjs2 argon2',
    '@electron/remote': 'commonjs2 @electron/remote',
    // Optional ws modules - not needed, ignore warnings
    'bufferutil': 'commonjs2 bufferutil',
    'utf-8-validate': 'commonjs2 utf-8-validate',
  },
  optimization: {
    minimize: false, // Don't minimize for better debugging
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
