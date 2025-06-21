const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'logs.txt');

function log(msg) {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, entry);
}

module.exports = { log };