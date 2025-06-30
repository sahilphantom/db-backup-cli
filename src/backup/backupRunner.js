const path = require('path');
const fs = require('fs');
const ora = require('ora');
const chalk = require('chalk');
const { exec } = require('child_process');

const { log } = require('../logger');
const { compressFile } = require('./compress');
const { notifySlack } = require('../notifier');
const dbDrivers = { mysql: require('../db/mysql') };
const config = require('../config');
const boxen = require('boxen');

async function runBackup(options) {
  const dbType = options.db;
  const table = options.table;
  const driver = dbDrivers[dbType];

  // Support custom database from options (for interactive db selection)
  if (options.database) {
    config[dbType].database = options.database;
  }

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

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    let cloudDriveStatus = 'No';

    if (options.cloudDrive) {
      spinner.text = `Uploading to Google Drive (via rclone)...`;

      await new Promise((resolve, reject) => {
        const rcloneDest = `gdrive:/DB-Backups/${path.basename(compressed)}`;
        exec(`rclone copy "${compressed}" "${rcloneDest}"`, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Rclone upload failed: ${stderr}`));
          } else {
            log(`✅ Uploaded to Google Drive: ${rcloneDest}`);
            cloudDriveStatus = 'Yes';
            resolve();
          }
        });
      });
    }

    spinner.succeed('✅ Backup completed successfully!');

    log(`✅ Backup created: ${compressed}`);
    await notifySlack(`✅ Backup completed for ${dbType}${table ? ` (table: ${table})` : ''}`);

    const summary = `
✔ ${chalk.bold('Backup Summary')}
${chalk.green('Database:')} ${dbType}
${chalk.green('Table:')} ${table || 'Full DB'}
${chalk.green('Stored Locally:')} ${options.local ? 'Yes' : 'No'}
${chalk.green('Uploaded to Drive:')} ${cloudDriveStatus}
`;

    console.log(boxen(summary, { padding: 1, borderColor: 'green' }));
    console.log(`\nBackup file: ${chalk.blue(compressed)}`);

  } catch (err) {
    spinner.fail(`❌ Backup failed: ${err.message}`);
    log(`❌ Error: ${err.message}`, 'error');
    await notifySlack(`❌ Backup failed for ${dbType}: ${err.message}`);
  }
}

module.exports = { runBackup };
