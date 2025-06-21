const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ora = require('ora');
const { log } = require('../logger');

async function runRestore({ db, file }) {
  const spinner = ora(`Restoring ${db} from ${file}...`).start();

  try {
    const filePath = path.isAbsolute(file) ? file : path.join(__dirname, '..', '..', file);
    if (!fs.existsSync(filePath)) {
      spinner.fail('❌ Backup file not found.');
      log(`❌ File not found: ${filePath}`);
      return;
    }

    if (db !== 'mysql') {
      spinner.fail(`❌ Restore not supported for DB: ${db}`);
      return;
    }

    const dbConfig = require('../config')[db];

    const restore = spawn(
      'mysql',
      ['-u', dbConfig.user, `-p${dbConfig.password}`, '-h', dbConfig.host, '-P', dbConfig.port, dbConfig.database],
      {
        shell: true,
        stdio: ['pipe', 'inherit', 'inherit']
      }
    );

    // Pipe the SQL file into the MySQL process
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(restore.stdin);

    restore.on('close', code => {
      if (code === 0) {
        spinner.succeed('✅ Restore completed successfully.');
        log(`Restore completed for ${filePath}`);
      } else {
        spinner.fail('❌ Restore failed.');
        log(`❌ Restore failed with exit code ${code}`);
      }
    });
  } catch (err) {
    spinner.fail(`❌ Restore failed: ${err.message}`);
    log(`❌ Restore failed: ${err.message}`);
  }
}

module.exports = { runRestore };
