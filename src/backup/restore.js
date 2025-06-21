const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const dbDrivers = { mysql: require('../db/mysql') };
const config = require('../config');
const { log } = require('../logger');

async function decompressIfGzipped(filePath) {
  if (!filePath.endsWith('.gz')) return filePath;

  const outputPath = filePath.replace(/\.gz$/, '');
  const source = fs.createReadStream(filePath);
  const dest = fs.createWriteStream(outputPath);
  const gunzip = zlib.createGunzip();

  return new Promise((resolve, reject) => {
    source.pipe(gunzip).pipe(dest)
      .on('finish', () => {
        log(`Decompressed ${filePath} → ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', reject);
  });
}

async function runRestore(options) {
  const dbType = options.db;
  const driver = dbDrivers[dbType];
  const dbConfig = config[dbType];
  let filePath = options.file;

  try {
    log(`Restoring ${dbType} from ${filePath}`);
    filePath = await decompressIfGzipped(filePath); // auto-decompress if needed
    await driver.restore(dbConfig, filePath);
    log(`✅ Restore completed from ${filePath}`);
  } catch (err) {
    log(`❌ Restore failed: ${err.message}`);
  }
}

module.exports = { runRestore };
