const cron = require('node-cron');
const { runBackup } = require('./backupRunner');

function scheduleBackups() {
  console.log('Scheduling backups every day at 2 AM...');
  cron.schedule('0 2 * * *', () => {
    runBackup({ db: 'mysql', cloud: true });
  });
}

module.exports = { scheduleBackups };