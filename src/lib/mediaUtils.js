/**
 * Convert any image File to WebP format using the Canvas API.
 * Falls back to the original file if WebP encoding is unsupported.
 * @param {File} file - Original image file
 * @param {number} quality - WebP quality 0–1 (default 0.85)
 * @returns {Promise<File>} WebP File
 */
export async function imageToWebP(file, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(objectUrl)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          const baseName = file.name.replace(/\.[^.]+$/, '')
          resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }))
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')) }
    img.src = objectUrl
  })
}

/**
 * Re-encode a video file using the browser's MediaRecorder API (to webm/vp9).
 * Falls back to the original file if the API or codec is unsupported (e.g. Safari).
 * @param {File} file - Original video file
 * @param {number} bitrate - Video bitrate in bps (default 2.5 Mbps)
 * @param {(progress: number) => void} onProgress - Called with 0–1 as video plays
 * @returns {Promise<File>} Compressed webm File (or original if unsupported)
 */
export async function compressVideo(file, bitrate = 2_500_000, onProgress) {
  // Feature-detect MediaRecorder + captureStream
  const videoEl = document.createElement('video')
  const canCapture = typeof videoEl.captureStream === 'function'
  const mimeType = 'video/webm;codecs=vp9'
  const canEncode = canCapture && MediaRecorder.isTypeSupported(mimeType)

  if (!canEncode) {
    // Graceful fallback — upload original
    return file
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = URL.createObjectURL(file)
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      const duration = video.duration
      const stream = video.captureStream()
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate })
      const chunks = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src)
        const blob = new Blob(chunks, { type: 'video/webm' })
        const baseName = file.name.replace(/\.[^.]+$/, '')
        resolve(new File([blob], `${baseName}.webm`, { type: 'video/webm' }))
      }
      recorder.onerror = (e) => { URL.revokeObjectURL(video.src); reject(e.error) }

      if (onProgress) {
        video.ontimeupdate = () => onProgress(Math.min(video.currentTime / duration, 0.99))
      }

      recorder.start(250) // collect data every 250ms
      video.play().catch(reject)

      video.onended = () => {
        recorder.stop()
        if (onProgress) onProgress(1)
      }
    }

    video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error('Video load failed')) }
  })
}
