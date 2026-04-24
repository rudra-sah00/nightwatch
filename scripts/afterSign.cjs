const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const { join } = require('node:path');

exports.default = async function afterSign(context) {
  const { appOutDir, packager } = context;
  const appName = packager.appInfo.productFilename;

  let electronBinary;
  if (process.platform === 'darwin') {
    electronBinary = join(
      appOutDir,
      `${appName}.app`,
      'Contents',
      'MacOS',
      appName,
    );
  } else if (process.platform === 'win32') {
    electronBinary = join(appOutDir, `${appName}.exe`);
  } else {
    electronBinary = join(appOutDir, appName);
  }

  try {
    await flipFuses(electronBinary, {
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    });
    console.log('✅ Electron fuses flipped successfully');
  } catch (err) {
    console.warn('⚠️ Fuse flipping skipped:', err.message);
  }
};
