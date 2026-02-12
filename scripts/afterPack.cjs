const fs = require('fs')
const path = require('path')

/**
 * electron-builder afterPack hook.
 * Copies node_modules/.prisma/client/ into the packaged app.
 *
 * electron-builder skips dot-prefixed dirs in node_modules during its
 * dependency detection, so .prisma never gets included automatically.
 * With asar disabled, the app lives in resources/app/.
 */
exports.default = async function afterPack(context) {
  const source = path.join(__dirname, '..', 'node_modules', '.prisma', 'client')
  const appDir = path.join(context.appOutDir, 'resources', 'app')
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
