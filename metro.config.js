const { getDefaultConfig } = require('@expo/metro-config');

module.exports = async () => {
  const config = await getDefaultConfig(__dirname);
  return {
    ...config,
    resolver: {
      ...config.resolver,
      sourceExts: [...config.resolver.sourceExts, 'jsx', 'ts', 'tsx', 'cjs'],
    },
  };
};