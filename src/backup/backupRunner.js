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
  const table = options.table;
  const driver = dbDrivers[dbType];
  const dbConfig = config[dbType];
  const backupDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  try {
    log(`Testing connection to ${dbType}...`);
    await driver.testConnection(dbConfig);

    const isEmpty = await driver.isEmpty(dbConfig, table);
    if (isEmpty) {
      const msg = table
        ? `⚠️ Table '${table}' is empty. Skipping backup.`
        : `⚠️ Database '${dbConfig.database}' is empty. Skipping backup.`;

      log(msg);
      await notifySlack(msg);
      return;
    }

    log(`Backing up ${dbType}${table ? ' table: ' + table : ''}...`);
    const filePath = await driver.backup(dbConfig, backupDir, table);
    log(`Backup created: ${filePath}`);

    const compressed = await compressFile(filePath);
    log(`Compressed to: ${compressed}`);

    if (options.cloud) {
      const result = await uploadToCloudinary(compressed);
      log(`Uploaded to cloud: ${result.secure_url}`);
    }

    await notifySlack(`✅ Backup completed for ${dbType}${table ? ' table: ' + table : ''}`);
  } catch (err) {
    log(`❌ Error: ${err.message}`);
    await notifySlack(`❌ Backup failed for ${dbType}${table ? ' table: ' + table : ''}: ${err.message}`);
  }
}

module.exports = { runBackup };