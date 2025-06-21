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
  const table = options.table; // optional
  const driver = dbDrivers[dbType];
  const dbConfig = config[dbType];

  if (!driver) {
    log(`❌ Unsupported DB type: ${dbType}`);
    return;
  }

  const backupDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  try {
    log(`Testing connection to ${dbType}...`);
    await driver.testConnection(dbConfig);

    // Check if DB or table is empty
    if (await driver.isEmpty(dbConfig, table)) {
      log(`⚠️ Skipped: ${table || 'Database'} is empty`);
      await notifySlack(`⚠️ Skipped: ${table || 'Database'} is empty`);
      return;
    }

    log(`Backing up ${dbType}${table ? ` table: ${table}` : ''}...`);
    const filePath = await driver.backup(dbConfig, backupDir, table);
    log(`Backup created: ${filePath}`);

    const compressed = await compressFile(filePath);
    log(`Compressed to: ${compressed}`);

    if (options.cloud) {
      const result = await uploadToCloudinary(compressed);
      log(`Uploaded to cloud: ${result.secure_url}`);

      // ✅ Auto-delete local files after upload
      fs.unlinkSync(filePath);
      fs.unlinkSync(compressed);
      log(`Deleted local files: ${filePath} and ${compressed}`);
    }

    await notifySlack(`✅ Backup completed for ${dbType}${table ? ` (table: ${table})` : ''}`);
  } catch (err) {
    log(`❌ Error: ${err.message}`);
    await notifySlack(`❌ Backup failed for ${dbType}: ${err.message}`);
  }
}

module.exports = { runBackup };
