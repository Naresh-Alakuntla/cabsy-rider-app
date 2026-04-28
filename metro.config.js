const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Standalone Metro config — @cabsy/shared is resolved through node_modules
 * (the vendored copy in ./cabsy-shared is installed via the `file:` protocol).
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
