/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

'use strict';

const failOnErrorsPlugin = require('fail-on-errors-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
    mode: 'development',
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
        new webpack.IgnorePlugin({resourceRegExp: /^\.\/locale$/, contextRegExp: /[\/\\]moment$/}),
        // Ignore optional packages which used by vscode-extension-telemetry
        new webpack.IgnorePlugin({resourceRegExp: /@opentelemetry\/tracing/}),
        new webpack.IgnorePlugin({resourceRegExp: /applicationinsights-native-metrics/}),
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

// in production mode, webpack decorates class constructor names.
// changing constructor names causes an issue for the following logic:
//    if type.constructor.name !== 'AbortSignal'...
// this issue is present in the package node-fetch - version "2.6.0", which is
// used by the package @azure/ms-rest-js - version "2.6.0".
// the following setup works around the issue by preventing the 'optimization'
// for the one type that is causing our issue.
module.exports = (env, argv) => {
    if (argv.mode === 'production') {
        config.mode = 'production'
        config.devtool = 'source-map'
        config.optimization = {
            ...(config.optimization || {}),
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        keep_fnames: /AbortSignal/,
                    },
                }),
            ],
        }
    }

    return config
}