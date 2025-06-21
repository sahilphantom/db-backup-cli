const fs = require('fs');
const zlib = require('zlib');

function compressFile(filePath) {
  return new Promise((res, rej) => {
    const gzip = zlib.createGzip();
    const source = fs.createReadStream(filePath);
    const dest = fs.createWriteStream(filePath + '.gz');
    source.pipe(gzip).pipe(dest)
      .on('finish', () => res(filePath + '.gz'))
      .on('error', rej);
  });
}

module.exports = { compressFile };
