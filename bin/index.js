const { program } = require('commander');
const dotenv = require('dotenv');
dotenv.config();

const { runBackup } = require('../src/backup/backupRunner');
const { runRestore } = require('../src/backup/restore');
const { scheduleBackups } = require('../src/backup/schedule');

program
  .command('backup')
  .description('Run backup')
  .option('--db <type>', 'Database type (mysql|postgres|mongodb|sqlite)')
  .option('--local', 'Store locally')
  .option('--cloud', 'Upload to cloud')
  .action(runBackup);

program
  .command('restore')
  .description('Restore from backup')
  .requiredOption('--db <type>', 'Database type')
  .requiredOption('--file <path>', 'Backup file path')
  .action(runRestore);

program
  .command('schedule')
  .description('Schedule automatic backups using cron')
  .action(scheduleBackups);

program.parse(process.argv);

// src/config.js
require('dotenv').config();

module.exports = {
  mysql: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PORT || 3306,
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  }
};