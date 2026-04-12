const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadAudio(filePath, sessionId, userId) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'speakup/recordings',
    public_id: `${sessionId}_${userId}`,
    resource_type: 'video',
  });

  return result.secure_url;
}

async function deleteAudio(publicId) {
  return await cloudinary.uploader.destroy(publicId, {
    resource_type: 'video',
  });
}

module.exports = {
  uploadAudio,
  deleteAudio,
};
