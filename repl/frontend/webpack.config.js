const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    name: 'Redcr REPL',
    mode: 'production',
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
                test: /\.s?css$/,
                use: ['style-loader', 'css-loader', 'sass-loader']
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
