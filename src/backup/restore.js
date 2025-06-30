const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ora = require('ora');
const chalk = require('chalk');
const boxen = require('boxen');
const inquirer = require('inquirer');

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
        log(`📦 Decompressed ${filePath} → ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', reject);
  });
}

async function runRestore(options) {
  const dbType = options.db;
  const driver = dbDrivers[dbType];
  const dbConfig = { ...config[dbType] };

  if (options.database) {
    dbConfig.database = options.database;
  }

  let filePath = options.file;
  const backupsDir = path.join(__dirname, '..', '..', 'backups');

  const fileMissing = !filePath || !fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory();

  if (fileMissing) {
    if (!fs.existsSync(backupsDir)) {
      log(`❌ Backup folder does not exist: ${backupsDir}`, 'error');
      return;
    }

    const files = fs.readdirSync(backupsDir).filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'));
    if (files.length === 0) {
      log(`❌ No backup files (.sql or .sql.gz) found in: ${backupsDir}`, 'error');
      return;
    }

    const { selectedFile } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedFile',
        message: 'Select a backup file to restore:',
        choices: files.sort((a, b) => fs.statSync(path.join(backupsDir, b)).mtime - fs.statSync(path.join(backupsDir, a)).mtime),
      }
    ]);

    filePath = path.join(backupsDir, selectedFile);
  }

  const spinner = ora().start();

  try {
    spinner.text = `Restoring ${dbType} from ${filePath}...`;

    const decompressed = await decompressIfGzipped(filePath);
    await driver.restore(dbConfig, decompressed);

    spinner.succeed('✅ Restore completed successfully.');
    log(`✅ Restore completed for ${filePath}`);

    console.log(boxen('Restore completed successfully!', {
      padding: 1,
      borderColor: 'green',
      align: 'center'
    }));
  } catch (err) {
    spinner.fail(`❌ Restore failed: ${err.message}`);
    log(`❌ Restore failed: ${err.message}`, 'error');
  }
}

module.exports = { runRestore };
