const cloudinary = require('cloudinary').v2;
const path = require('path');
const { exec } = require('child_process');
const { log } = require('../logger');
const config = require('../config');

cloudinary.config(); // Loads CLOUDINARY_URL from .env

function generateSignedUrl(public_id) {
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    {
      public_id,
      resource_type: 'raw',
      timestamp,
    },
    cloudinary.config().api_secret
  );

  const url = `https://res.cloudinary.com/${cloudinary.config().cloud_name}/raw/upload` +
    `?public_id=${encodeURIComponent(public_id)}&timestamp=${timestamp}&signature=${signature}&api_key=${cloudinary.config().api_key}`;

  return url;
}

async function uploadToCloudinary(filePath) {
  const fileName = path.basename(filePath);

  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'raw',
    folder: 'db_backups',
    use_filename: true,
    unique_filename: false,
    type: 'upload'
  });

  const public_id = `db_backups/${fileName}`;
  const signedUrl = generateSignedUrl(public_id);
  log(`🔐 Signed Cloud URL: ${signedUrl}`);
  console.log(`🔐 Signed Cloud URL: ${signedUrl}`);

  return result;
}

async function uploadToGoogleDrive(filePath) {
  return new Promise((resolve, reject) => {
    const remote = process.env.RCLONE_REMOTE_NAME || 'gdrive';
    const folder = process.env.RCLONE_BACKUP_FOLDER || 'DB-Backups';

    const destination = `${remote}:${folder}/`;
    const command = `rclone copy "${filePath}" "${destination}" --progress`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`❌ Google Drive upload failed: ${error.message}`, 'error');
        return reject(error);
      }

      log(`✅ Uploaded to Google Drive: ${destination}`);
      console.log(`✅ Uploaded to Google Drive: ${destination}`);
      return resolve({ url: destination });
    });
  });
}

module.exports = {
  uploadToCloudinary,
  uploadToGoogleDrive
};
