var path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: './src/simple-js-rpc.js',
    // target: 'node',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'simple-js-rpc.js',
        library: 'simpleJsRpc',
        libraryTarget: 'umd',
    },
    module: {
        rules: [
            {test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"}
        ]
    },
    stats: {
        colors: true
    },
    devtool: 'source-map'
};
