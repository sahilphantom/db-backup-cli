const mysql = require('mysql2/promise');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testConnection(config) {
  const conn = await mysql.createConnection(config);
  await conn.ping();
  await conn.end();
}

function backup(config, outDir) {
  const filename = `${config.database}_${Date.now()}.sql`;
  const file = path.join(outDir, filename);
  const cmd = `mysqldump -u ${config.user} -p${config.password} -h ${config.host} -P ${config.port} ${config.database} > ${file}`;
  return new Promise((res, rej) => exec(cmd, err => (err ? rej(err) : res(file))));
}

function restore(config, filePath) {
  const cmd = `mysql -u ${config.user} -p${config.password} -h ${config.host} -P ${config.port} ${config.database} < ${filePath}`;
  return new Promise((res, rej) => exec(cmd, err => (err ? rej(err) : res())));
}

module.exports = { testConnection, backup, restore };