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

// src/db/mysql.js
const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testConnection(config) {
  const conn = await mysql.createConnection(config);
  await conn.ping();
  await conn.end();
}

function backup(config, outDir, table = null) {
  const timestamp = Date.now();
  const name = table || config.database;
  const filename = `${name}_${timestamp}.sql`;
  const file = path.join(outDir, filename);

  const passwordPart = config.password ? `-p${config.password}` : '';
  const cmd = table
    ? `mysqldump -u ${config.user} ${passwordPart} -h ${config.host} -P ${config.port} ${config.database} ${table} > ${file}`
    : `mysqldump -u ${config.user} ${passwordPart} -h ${config.host} -P ${config.port} ${config.database} > ${file}`;

  return new Promise((res, rej) => exec(cmd, err => (err ? rej(err) : res(file))));
}

function restore(config, filePath) {
  const cmd = `mysql -u ${config.user} -p${config.password} -h ${config.host} -P ${config.port} ${config.database} < ${filePath}`;
  return new Promise((res, rej) => exec(cmd, err => (err ? rej(err) : res())));
}

async function isEmpty(config, table = null) {
  const conn = await mysql.createConnection(config);

  if (table) {
    try {
const [rows] = await conn.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      await conn.end();
      return rows[0].count === 0;
    } catch (err) {
      await conn.end();
      return true;
    }
  }

  const [tables] = await conn.query(`SHOW TABLES`);
  await conn.end();
  return tables.length === 0;
}

module.exports = { testConnection, backup, restore, isEmpty };