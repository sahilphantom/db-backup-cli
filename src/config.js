require('dotenv').config();

module.exports = {
  mysql: {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    port: process.env.MYSQL_PORT || 3306,
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
   drive: {
    remoteName: process.env.RCLONE_REMOTE_NAME || 'gdrive',
    backupFolder: process.env.RCLONE_BACKUP_FOLDER || 'DB-Backups',
  }
};