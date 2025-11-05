const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

// Add GLB and GLTF file support
config.resolver.assetExts.push('glb', 'gltf', 'bin', 'obj', 'mtl');
 
module.exports = withNativeWind(config, { input: './global.css' })