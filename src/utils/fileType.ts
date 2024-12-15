const imageExtnames = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];
const audioExtnames = ["mp3", "wav", "m4a"];
const videoExtnames = ["mp4", "webm", "ogg"];

export function isImage(extname: string) {
  return imageExtnames.includes(extname);
}

export function isAudio(extname: string) {
  return audioExtnames.includes(extname);
}

export function isVideo(extname: string) {
  return videoExtnames.includes(extname);
}
