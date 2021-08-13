module.exports = {
    name: 'Server',
    mode: 'production',
    entry: {
        'convert': './src/convert.ts'
    },
    output: {
        filename: '[name].js',
        library: {
            type: 'commonjs2'
        }
    },
    target: 'node',
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        configFile: "tsconfig.json"
                    }
                }]
            }
        ]
    },
    externals: ['aws-sdk'],
    optimization: {
        splitChunks: {
            name: 'vendor',
            chunks: 'all'
        }
    }
}