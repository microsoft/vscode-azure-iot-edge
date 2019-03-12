/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const failOnErrorsPlugin = require('fail-on-errors-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: { // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    devtool: 'source-map',
    externals: {
        vscode: "commonjs vscode" // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    resolve: { // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js', '.json']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                loader: 'ts-loader',
            }]
        }]
    },
    plugins: [
        // Ignore all locale files of moment.js, which can save 50KB
        // https://webpack.js.org/plugins/ignore-plugin/#ignore-moment-locales
        new webpack.IgnorePlugin(/^\.\/locale$/, /[\/\\]moment$/),
        // Suppress warnings of known dynamic require
        new webpack.ContextReplacementPlugin(
            /applicationinsights[\/\\]out[\/\\]Library/,
            false,
            /$^/
        ),
        new webpack.ContextReplacementPlugin(
            /ms-rest[\/\\]lib/,
            false,
            /$^/
        ),
        new webpack.ContextReplacementPlugin(
            /applicationinsights[\/\\]out[\/\\]AutoCollection/,
            false,
            /$^/
        ),
        new webpack.ContextReplacementPlugin(
            /express[\/\\]lib/,
            false,
            /$^/
        ),
        // Fail on warnings so that CI can report new warnings which requires attention
        new failOnErrorsPlugin({
            failOnErrors: true,
            failOnWarnings: true,
        })
    ]
}

module.exports = config;
