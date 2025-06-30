#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');

const { runBackup } = require('../src/backup/backupRunner');
const { runRestore } = require('../src/backup/restore');
const { scheduleBackups } = require('../src/backup/schedule');

const mysql = require('mysql2/promise');
const config = require('../src/config');

// Show CLI title
console.log(
  chalk.cyan(
    figlet.textSync('DB Backup CLI', { horizontalLayout: 'fitted' })
  )
);

// Helper: Get all databases
async function fetchDatabases() {
  try {
    const conn = await mysql.createConnection(config.mysql);
    const [rows] = await conn.query('SHOW DATABASES');
    await conn.end();
    return rows.map(row => row.Database).filter(db =>
      !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db)
    );
  } catch (err) {
    console.error('❌ Error fetching databases:', err.message);
    return [];
  }
}

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
      cloudDrive: {
        describe: 'Upload backup to Google Drive (via rclone)',
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
        const dbs = await fetchDatabases();
        const { selectedDb, table, local, cloudDrive } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedDb',
            message: 'Select a database to backup',
            choices: dbs.length > 0 ? dbs : ['No databases found'],
          },
          { type: 'input', name: 'table', message: 'Table name (optional)', default: '' },
          { type: 'confirm', name: 'local', message: 'Store locally?', default: true },
          { type: 'confirm', name: 'cloudDrive', message: 'Upload to Google Drive?', default: false },
        ]);

        if (selectedDb === 'No databases found') {
          console.log('❌ No databases available to backup.');
          return;
        }

        const updatedOptions = {
          db: 'mysql',
          table,
          local,
          cloudDrive,
          database: selectedDb,
        };

        await runBackup(updatedOptions);
      }

     if (answers.operation === 'Restore Backup') {
  const { db, database, file } = await inquirer.prompt([
    { type: 'list', name: 'db', message: 'Choose DB', choices: ['mysql'] },
    { type: 'input', name: 'database', message: 'Enter name of DB to restore into (must exist)' },
    { type: 'input', name: 'file', message: 'Enter .sql file path (or leave blank to pick)' },
  ]);

  await runRestore({ db, file, database });
}


      if (answers.operation === 'Schedule Backup') {
        await scheduleBackups();
      }
    },
  })
  .help()
  .argv;
