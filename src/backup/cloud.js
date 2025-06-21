const cloudinary = require('cloudinary').v2;
const path = require('path');
const { log } = require('../logger');

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
    type: 'upload' // No need to sign this
  });

  const public_id = `db_backups/${fileName}`;
  const signedUrl = generateSignedUrl(public_id);
  log(`🔐 Signed Cloud URL: ${signedUrl}`);
  console.log(`🔐 Signed Cloud URL: ${signedUrl}`);

  return result;
}

module.exports = { uploadToCloudinary };
