const fs = require('fs')
const path = require('path')

/**
 * electron-builder afterPack hook.
 * Copies node_modules/.prisma/client/ into the packaged app.
 *
 * electron-builder skips dot-prefixed dirs in node_modules during its
 * dependency detection, so .prisma never gets included automatically.
 *
 * On macOS the app lives inside a .app bundle:
 *   <appOutDir>/<ProductName>.app/Contents/Resources/app/
 * On Windows/Linux it lives at:
 *   <appOutDir>/resources/app/
 */
exports.default = async function afterPack(context) {
  const source = path.join(__dirname, '..', 'node_modules', '.prisma', 'client')

  let appDir
  if (context.electronPlatformName === 'darwin') {
    const appName = context.packager.appInfo.productFilename
    appDir = path.join(context.appOutDir, `${appName}.app`, 'Contents', 'Resources', 'app')
  } else {
    appDir = path.join(context.appOutDir, 'resources', 'app')
  }

  const dest = path.join(appDir, 'node_modules', '.prisma', 'client')

  console.log(`[afterPack] Copying .prisma/client → ${dest}`)
  copyDirSync(source, dest)
  console.log('[afterPack] Done.')
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    // Skip temp files left by Prisma engine
    if (entry.name.includes('.tmp')) continue

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
