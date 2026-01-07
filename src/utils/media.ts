// Utilities for working with media elements

// Get all media elements (video and audio) in the document
export function getAllMediaElements(): (HTMLVideoElement | HTMLAudioElement)[] {
  const videos = Array.from(document.querySelectorAll("video"));
  const audios = Array.from(document.querySelectorAll("audio"));

  return [...videos, ...audios];
}

// Check if a media element has audio tracks
export function hasAudioTrack(
  element: HTMLVideoElement | HTMLAudioElement
): boolean {
  if (element instanceof HTMLAudioElement) return true;

  // For video, check if it has audio tracks
  const video = element as HTMLVideoElement & {
    mozHasAudio?: boolean;
    webkitAudioDecodedByteCount?: number;
    audioTracks?: any;
  };

  // Check standard audioTracks API if available
  if (video.audioTracks && video.audioTracks.length > 0) {
    return true;
  }

  // Fallback to vendor-specific checks
  if (video.mozHasAudio !== undefined) {
    return video.mozHasAudio !== false;
  }

  if (video.webkitAudioDecodedByteCount !== undefined) {
    return video.webkitAudioDecodedByteCount > 0;
  }

  // If we can't determine, assume it might have audio (safer default)
  return true;
}
