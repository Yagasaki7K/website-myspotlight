import type { AudioSource } from "@/services/audio";
import { createZip, type ZipEntry } from "@/services/zip";
import type { ProcessingFailure, SpotifyPlaylist, SpotifyTrack } from "@/types/spotify";
import { formatTrackFilename } from "@/utils/filename";

export interface ProcessResult { zip: Blob; processed: number; failures: ProcessingFailure[] }
export interface ProcessOptions { concurrency?: number; onProgress?: (completed: number, track: SpotifyTrack) => void }

/** Processes at most three audio lookups at a time and retains playlist insertion order in the ZIP. */
export async function processPlaylist(playlist: SpotifyPlaylist, source: AudioSource, options: ProcessOptions = {}): Promise<ProcessResult> {
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 3, 3, playlist.tracks.length || 1));
  const entries: Array<ZipEntry | undefined> = new Array(playlist.tracks.length);
  const failures: ProcessingFailure[] = []; const names = new Set<string>(); let cursor = 0; let completed = 0;
  async function worker() { while (true) { const index = cursor++; const track = playlist.tracks[index]; if (!track) return; try { entries[track.playlistPosition] = { name: formatTrackFilename(track, names), blob: await source.getAudio(track) }; } catch (error) { failures.push({ track, reason: error instanceof Error ? error.message : "Falha desconhecida" }); } finally { completed += 1; options.onProgress?.(completed, track); await new Promise<void>((resolve) => setTimeout(resolve, 0)); } } }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { zip: await createZip(entries.filter((entry): entry is ZipEntry => Boolean(entry))), processed: completed - failures.length, failures };
}
