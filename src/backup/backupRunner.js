const path = require('path');
const fs = require('fs');
const ora = require('ora');
const chalk = require('chalk');
const boxen = require('boxen');

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

  if (!driver) {
    log(`❌ Unsupported DB type: ${dbType}`, 'error');
    return;
  }

  const backupDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const spinner = ora().start();
  try {
    spinner.text = `Connecting to ${dbType}...`;
    await driver.testConnection(dbConfig);

    if (await driver.isEmpty(dbConfig, table)) {
      spinner.warn(`⚠️ ${table || 'Database'} is empty. Skipping backup.`);
      log(`⚠️ Skipped: ${table || 'Database'} is empty`, 'warn');
      await notifySlack(`⚠️ Skipped: ${table || 'Database'} is empty`);
      return;
    }

    spinner.text = `Backing up ${table || 'database'}...`;
    const filePath = await driver.backup(dbConfig, backupDir, table);

    spinner.text = `Compressing backup file...`;
    const compressed = await compressFile(filePath);

    let cloudUrl = '';
    if (options.cloud) {
      spinner.text = `Uploading to Cloudinary...`;
      const result = await uploadToCloudinary(compressed);
      cloudUrl = result.secure_url;
      fs.unlinkSync(filePath);
      fs.unlinkSync(compressed);
      log(`✅ Uploaded to cloud: ${cloudUrl}`);
    }

    spinner.succeed('✅ Backup completed successfully!');

    log(`✅ Backup created: ${compressed}`);
    await notifySlack(`✅ Backup completed for ${dbType}${table ? ` (table: ${table})` : ''}`);

    // 🎉 Final summary box
    const summary = `
${chalk.bold('✔ Backup Summary')}
${chalk.green('Database:')} ${dbType}
${chalk.green('Table:')} ${table || 'Full DB'}
${chalk.green('Stored Locally:')} ${options.local ? 'Yes' : 'No'}
${chalk.green('Uploaded to Cloud:')} ${options.cloud ? 'Yes' : 'No'}
${options.cloud ? chalk.green('Cloud URL:') + ' ' + cloudUrl : ''}
    `;
    console.log(boxen(summary, { padding: 1, borderColor: 'green' }));

  } catch (err) {
    spinner.fail(`❌ Backup failed: ${err.message}`);
    log(`❌ Error: ${err.message}`, 'error');
    await notifySlack(`❌ Backup failed for ${dbType}: ${err.message}`);
  }
}

module.exports = { runBackup };
