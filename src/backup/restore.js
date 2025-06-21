const dbDrivers = { mysql: require('../db/mysql') };
const config = require('../config');
const { log } = require('../logger');

async function runRestore(options) {
  const dbType = options.db;
  const driver = dbDrivers[dbType];
  const dbConfig = config[dbType];
  const filePath = options.file;

  try {
    log(`Restoring ${dbType} from ${filePath}`);
    await driver.restore(dbConfig, filePath);
    log(`Restore completed.`);
  } catch (err) {
    log(`❌ Restore failed: ${err.message}`);
  }
}

module.exports = { runRestore };