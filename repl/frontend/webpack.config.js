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
                exclude: /node_modules/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        compiler: 'ttypescript',
                        configFile: 'tsconfig.json'
                    }
                }]
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html'
        })
    ]
}
