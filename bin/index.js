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
  .option('--table <name>', 'Optional: backup a specific table')
  .option('--local', 'Store locally')         // default: true
  .option('--no-local', 'Do not store locally after cloud upload') // new: disable local storage
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
