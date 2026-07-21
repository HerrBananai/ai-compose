module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Worklets-Core (VisionCamera Frame Processors) muss vor Reanimated laufen.
      ['react-native-worklets-core/plugin'],
      // Reanimated-Plugin MUSS als letztes stehen.
      'react-native-reanimated/plugin',
    ],
  };
};
