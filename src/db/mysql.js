const mysql = require('mysql2/promise');
const { exec, spawn } = require('child_process');
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
  return new Promise((res, rej) => {
    const { spawn } = require('child_process');
    const fs = require('fs');

    if (!fs.existsSync(filePath) || fs.lstatSync(filePath).isDirectory()) {
      return rej(new Error(`Invalid restore file: ${filePath}`));
    }

    const { user, password, host, port, database } = config;

    const args = ['-u', user];

    if (password) {
      args.push('-p' + password); // ✅ only if password exists
    }

    args.push('-h', host);
    args.push('-P', port.toString());
    args.push(database);

    const mysql = spawn('mysql', args);

    const stream = fs.createReadStream(filePath);
    stream.pipe(mysql.stdin);
    stream.on('end', () => mysql.stdin.end());
    stream.on('error', (err) => rej(err));
    mysql.on('error', (err) => rej(err));

    mysql.on('close', (code) => {
      if (code === 0) res();
      else rej(new Error(`Restore failed with exit code ${code}`));
    });
  });
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