module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // VisionCamera Frame Processors (inkl. Skia-Processor) laufen über
      // react-native-worklets-core.
      ['react-native-worklets-core/plugin'],
      // VisionCamera/Skia ziehen react-native-reanimated als optionale
      // Dependency herein. Das Reanimated-Babel-Plugin MUSS als letztes stehen.
      'react-native-reanimated/plugin',
    ],
  };
};
