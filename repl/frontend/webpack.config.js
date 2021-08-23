const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    name: 'Redcr REPL',
    mode: 'development',
    devtool: false,
    entry: './src/index.tsx',
    output: {
        filename: '[name].js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: [/node_modules/, /\.sample\.ts$/],
                use: [{
                    loader: 'ts-loader',
                    options: {
                        compiler: 'ttypescript',
                        configFile: 'tsconfig.json'
                    }
                }]
            },
            {
                test: /\.sample\.ts$/,
                type: 'asset/source'
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html'
        })
    ]
}
