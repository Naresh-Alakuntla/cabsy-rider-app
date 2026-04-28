// Replace zero-byte placeholders in assets/fonts/ with real General Sans
// .ttf files from https://www.fontshare.com/fonts/general-sans, then run:
//   npx react-native-asset
// (or, on RN 0.72+, fonts can be linked via this config + `npx react-native-asset`)
module.exports = {
  assets: ['./assets/fonts/'],
};
