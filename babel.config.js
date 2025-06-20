module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Comment out or remove this line completely
      // 'react-native-reanimated/plugin',
    ],
  };
};