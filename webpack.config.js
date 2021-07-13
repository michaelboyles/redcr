const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    name: 'Redcr',
    mode: 'development',
    devtool: false,
    entry: './src/main.ts',
    output: {
        filename: '[name].js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    target: "es2021",
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
            template: 'src/index.html'
        })
    ]
}