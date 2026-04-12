
export async function uploadAudioToBackend(audioBlob, sessionId, userId, onProgress) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const formData = new FormData();
  formData.append('file', audioBlob, `${sessionId}_${userId}.webm`);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'speakup/recordings');
  formData.append('resource_type', 'video');

  console.log('Starting direct Cloudinary upload...', { cloudName, uploadPreset, sessionId, userId });

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        console.log('Cloudinary upload progress:', percent + '%');
        if (typeof onProgress === 'function') onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        console.log('Cloudinary upload successful, secure_url:', data.secure_url);
        resolve(data.secure_url);
      } else {
        console.error('Cloudinary upload failed:', xhr.status, xhr.responseText);
        reject(new Error('Cloudinary upload failed: ' + xhr.responseText));
      }
    };

    xhr.onerror = () => {
      console.error('Cloudinary upload network error');
      reject(new Error('Cloudinary upload network error'));
    };

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.send(formData);
  });
}
