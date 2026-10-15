const fs = require('node:fs');
const path = require('node:path');

const localAndroidGoogleServicesFile = './google-services.json';
const localIosGoogleServicesFile = './GoogleService-Info.plist';
const androidGoogleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? localAndroidGoogleServicesFile;
const iosGoogleServicesFile = process.env.GOOGLE_SERVICE_INFO_PLIST ?? localIosGoogleServicesFile;
const hasAndroidGoogleServices = Boolean(
  process.env.GOOGLE_SERVICES_JSON
  || fs.existsSync(path.join(__dirname, localAndroidGoogleServicesFile)),
);
const hasIosGoogleServices = Boolean(
  process.env.GOOGLE_SERVICE_INFO_PLIST
  || fs.existsSync(path.join(__dirname, localIosGoogleServicesFile)),
);

module.exports = ({ config }) => {
  const basePlugins = config.plugins ?? [];
  const plugins = basePlugins.filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginName !== 'react-native-nitro-google-signin';
  });

  // The native plugin is enabled automatically once the Firebase service
  // files are placed in the project root. This keeps Expo Go/web config valid
  // before the platform OAuth setup is complete.
  if (hasAndroidGoogleServices || hasIosGoogleServices) {
    plugins.push([
      'react-native-nitro-google-signin',
      {
        ...(hasAndroidGoogleServices ? { androidGoogleServicesFile } : {}),
        ...(hasIosGoogleServices ? { iosGoogleServicesFile } : {}),
      },
    ]);
  }

  return {
    ...config,
    plugins,
    android: {
      ...config.android,
      ...(hasAndroidGoogleServices ? { googleServicesFile: androidGoogleServicesFile } : {}),
    },
    ios: {
      ...config.ios,
      ...(hasIosGoogleServices ? { googleServicesFile: iosGoogleServicesFile } : {}),
    },
  };
};
