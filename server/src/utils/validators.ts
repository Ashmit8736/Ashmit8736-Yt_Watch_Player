/**
 * Input validation utilities
 */

export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 3 && trimmed.length <= 30;
}

export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 4;
}

export function isValidRoomId(roomId: string): boolean {
  if (!roomId || typeof roomId !== 'string') return false;
  return /^[a-zA-Z0-9_-]{4,12}$/.test(roomId.trim());
}

export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  
  // Direct 11-char video ID
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Parse URLs (youtu.be, youtube.com/watch, youtube.com/embed)
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return (match && match[1]) ? match[1] : null;
}
