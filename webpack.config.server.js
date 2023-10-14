const webpack = require('webpack')
const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = {
    entry: [
        './src/server/index'
    ],
    mode: 'development',
    // stats: 'verbose',
    watch: true,
    target: 'node',
    externals: [nodeExternals()],
    module: {
        rules: [{
            test: /\.js?$/,
            use: 'babel-loader',
            exclude: /node_modules/
        }]
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(),
        new webpack.DefinePlugin({
            "process.env": {
                "BUILD_TARGET": JSON.stringify('server')
            }
        }),
    ],
    output: {
        path: path.resolve(__dirname, 'build/server'),
        filename: 'index.bundle.js'
      }
}