const cloudinary = require('cloudinary').v2;
const config = require('../config');
cloudinary.config(config.cloudinary);

function uploadToCloudinary(filePath) {
  return cloudinary.uploader.upload(filePath, {
    resource_type: 'raw',
    folder: 'db_backups',
    use_filename: true,
    unique_filename: false,
    type: 'upload',               
    access_mode: 'public'         
  });
}

module.exports = { uploadToCloudinary };