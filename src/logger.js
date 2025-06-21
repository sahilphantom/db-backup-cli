const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const logFile = path.join(__dirname, '..', 'logs.txt');

function log(msg, type = 'info') {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(logFile, entry);

  // Colored output
  if (type === 'error') {
    console.log(chalk.red(entry.trim()));
  } else if (type === 'warn') {
    console.log(chalk.yellow(entry.trim()));
  } else {
    console.log(chalk.green(entry.trim()));
  }
}

module.exports = { log };
