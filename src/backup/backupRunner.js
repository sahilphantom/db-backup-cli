const path = require('path');
const fs = require('fs');
const { log } = require('../logger');
const { compressFile } = require('./compress');
const { uploadToCloudinary } = require('./cloud');
const { notifySlack } = require('../notifier');
const dbDrivers = { mysql: require('../db/mysql') };
const config = require('../config');

async function runBackup(options) {
  const dbType = options.db;
  const driver = dbDrivers[dbType];
  const dbConfig = config[dbType];
  const backupDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  try {
    log(`Testing connection to ${dbType}...`);
    await driver.testConnection(dbConfig);

    log(`Backing up ${dbType}...`);
    const filePath = await driver.backup(dbConfig, backupDir);
    log(`Backup created: ${filePath}`);

    const compressed = await compressFile(filePath);
    log(`Compressed to: ${compressed}`);

    if (options.cloud) {
      const result = await uploadToCloudinary(compressed);
      log(`Uploaded to cloud: ${result.secure_url}`);
    }

    await notifySlack(`✅ Backup completed for ${dbType}`);
  } catch (err) {
    log(`❌ Error: ${err.message}`);
    await notifySlack(`❌ Backup failed for ${dbType}: ${err.message}`);
  }
}

module.exports = { runBackup };