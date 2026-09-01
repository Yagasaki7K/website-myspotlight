const PLAYLIST_ID = /^[A-Za-z0-9]{22}$/;

export function extractPlaylistId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.hostname !== "open.spotify.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "playlist" || !parts[1] || !PLAYLIST_ID.test(parts[1])) return null;
    return parts[1];
  } catch { return null; }
}

export function validateSpotifyUrl(value: string): { valid: boolean; message?: string; playlistId?: string } {
  if (!value.trim()) return { valid: false, message: "Insira uma URL de playlist do Spotify." };
  try { new URL(value.trim()); } catch { return { valid: false, message: "URL inválida." }; }
  const playlistId = extractPlaylistId(value);
  return playlistId ? { valid: true, playlistId } : { valid: false, message: "Insira uma URL de playlist do Spotify." };
}
