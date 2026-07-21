module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // VisionCamera Frame Processors (inkl. Skia-Processor) laufen über
      // react-native-worklets-core. Wir nutzen KEIN Reanimated -> nur dieses
      // eine Worklet-Plugin, damit sich nichts an der 'worklet'-Direktive beißt.
      ['react-native-worklets-core/plugin'],
    ],
  };
};
