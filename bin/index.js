#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');

const { runBackup } = require('../src/backup/backupRunner');
const { runRestore } = require('../src/backup/restore');
const { scheduleBackups } = require('../src/backup/schedule');

// Show CLI title (without boxen)
console.log(
  chalk.cyan(
    figlet.textSync('DB Backup CLI', { horizontalLayout: 'fitted' })
  )
);

// Define CLI commands
yargs(hideBin(process.argv))
  .command({
    command: 'backup',
    desc: 'Create a backup of your database',
    builder: {
      db: {
        describe: 'Database type (mysql)',
        demandOption: true,
        type: 'string',
      },
      table: {
        describe: 'Table name (optional)',
        type: 'string',
      },
      local: {
        describe: 'Save backup locally',
        type: 'boolean',
        default: false,
      },
      cloud: {
        describe: 'Upload backup to cloud',
        type: 'boolean',
        default: false,
      },
    },
    handler: runBackup,
  })
  .command({
    command: 'restore',
    desc: 'Restore a backup file',
    builder: {
      db: {
        describe: 'Database type (mysql)',
        demandOption: true,
        type: 'string',
      },
      file: {
        describe: 'Path to backup .sql file',
        demandOption: true,
        type: 'string',
      },
    },
    handler: runRestore,
  })
  .command({
    command: 'schedule',
    desc: 'Schedule automatic daily backups (2 AM)',
    handler: scheduleBackups,
  })
  .command({
    command: '$0',
    desc: 'Interactive mode',
    handler: async () => {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'operation',
          message: 'What do you want to do?',
          choices: ['Backup Database', 'Restore Backup', 'Schedule Backup'],
        },
      ]);

      if (answers.operation === 'Backup Database') {
        const { db, table, local, cloud } = await inquirer.prompt([
          { type: 'list', name: 'db', message: 'Choose DB', choices: ['mysql'] },
          { type: 'input', name: 'table', message: 'Table name (optional)', default: '' },
          { type: 'confirm', name: 'local', message: 'Store locally?', default: true },
          { type: 'confirm', name: 'cloud', message: 'Upload to cloud?', default: false },
        ]);

        await runBackup({ db, table, local, cloud });
      }

      if (answers.operation === 'Restore Backup') {
        const { db, file } = await inquirer.prompt([
          { type: 'list', name: 'db', message: 'Choose DB', choices: ['mysql'] },
          { type: 'input', name: 'file', message: 'Enter .sql file path' },
        ]);

        await runRestore({ db, file });
      }

      if (answers.operation === 'Schedule Backup') {
        await scheduleBackups();
      }
    },
  })
  .help()
  .argv;
