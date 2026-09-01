import type { SpotifyTrack } from "@/types/spotify";

const INVALID = /[\\/:*?"<>|\u0000-\u001F]/g;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_STEM_LENGTH = 180;

export function sanitizeFilename(value: string): string {
  const cleaned = value.normalize("NFC").replace(INVALID, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/g, "");
  const safe = cleaned || "Sem título";
  return (RESERVED.test(safe) ? `_${safe}` : safe).slice(0, MAX_STEM_LENGTH);
}

export function formatTrackFilename(track: SpotifyTrack, used = new Set<string>()): string {
  const artist = sanitizeFilename(track.artists.map(({ name }) => name).join(", "));
  const album = sanitizeFilename(track.album.name);
  const title = sanitizeFilename(track.name);
  const position = String(track.playlistPosition + 1).padStart(2, "0");
  const stem = `${artist} - ${album} - ${position} - ${title}`.slice(0, MAX_STEM_LENGTH);
  let name = `${stem}.mp3`; let duplicate = 2;
  while (used.has(name.toLocaleLowerCase())) name = `${stem} (${duplicate++}).mp3`;
  used.add(name.toLocaleLowerCase());
  return name;
}

export function formatZipFilename(playlistName: string): string { return `MySpotlight - ${sanitizeFilename(playlistName)}.zip`; }
