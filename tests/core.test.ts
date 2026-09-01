import { afterAll, describe, expect, test } from "bun:test";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalAudioSource, type AudioSource } from "../src/services/audio";
import { processPlaylist } from "../src/services/process";
import { createZip } from "../src/services/zip";
import type { SpotifyPlaylist, SpotifyTrack } from "../src/types/spotify";
import { formatTrackFilename, sanitizeFilename } from "../src/utils/filename";
import { extractPlaylistId, validateSpotifyUrl } from "../src/utils/spotify";
import { getPlaylist } from "../src/services/spotify";

const makeTrack = (position: number): SpotifyTrack => ({ id: `id-${position}`, name: `Song ${position}`, artists: [{ name: `Artist ${position}` }], album: { name: `Album ${position}` }, trackNumber: position + 1, playlistPosition: position });
const makePlaylist = (count: number): SpotifyPlaylist => ({ id: "playlist", name: "Audit Playlist", tracks: Array.from({ length: count }, (_, position) => makeTrack(position)) });
const directories: string[] = []; afterAll(() => directories.forEach((directory) => rmSync(directory, { recursive: true, force: true })));
async function listZip(blob: Blob) { const directory = mkdtempSync(join(tmpdir(), "myspotlight-")); directories.push(directory); const archive = join(directory, "playlist.zip"); writeFileSync(archive, Buffer.from(await blob.arrayBuffer())); const validation = Bun.spawnSync(["unzip", "-t", archive]); expect(validation.exitCode).toBe(0); const listing = Bun.spawnSync(["unzip", "-Z1", archive]); expect(listing.exitCode).toBe(0); return { archive, names: new TextDecoder().decode(listing.stdout).trim().split("\n").filter(Boolean) }; }

describe("filenames and Spotify URLs", () => {
  test("uses Artist - Album - Number - Music.mp3 with Windows-safe names", () => {
    const track = { ...makeTrack(3), name: "A/B", artists: [{ name: "Ártist" }], album: { name: "Ál:bum" } };
    expect(formatTrackFilename(track)).toBe("Ártist - Ál bum - 04 - A B.mp3");
    expect(sanitizeFilename(" CON. ")).toBe("_CON");
    expect(extractPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x")).toBe("37i9dQZF1DXcBWIGoYBM5M");
    expect(validateSpotifyUrl("not-a-url").valid).toBeFalse();
  });
  test("follows Spotify pagination and retains original positions", async () => {
    const originalFetch = globalThis.fetch; const tracks = [makeTrack(0), makeTrack(1), makeTrack(2)]; let call = 0;
    globalThis.fetch = (async () => { call++; if (call === 1) return Response.json({ id: "playlist", name: "Paged" }); if (call === 2) return Response.json({ items: [{ track: { id: tracks[0].id, name: tracks[0].name, artists: tracks[0].artists, album: tracks[0].album, track_number: 1 } }, { track: null }], next: "https://api.spotify.com/v1/next-page" }); return Response.json({ items: tracks.slice(1).map((track) => ({ track: { id: track.id, name: track.name, artists: track.artists, album: track.album, track_number: track.trackNumber } })), next: null }); }) as typeof fetch;
    try { const playlist = await getPlaylist("37i9dQZF1DXcBWIGoYBM5M"); expect(playlist.tracks.map((track) => track.playlistPosition)).toEqual([0, 1, 2]); } finally { globalThis.fetch = originalFetch; }
  });
});

describe("Playlist → AudioSource → processing → ZIP", () => {
  test("creates an ordered, valid ZIP from five authorized mock tracks", async () => {
    const playlist = makePlaylist(5); const source: AudioSource = { getAudio: async (track) => new Blob([`audio-${track.playlistPosition}`], { type: "audio/mpeg" }) };
    const result = await processPlaylist(playlist, source); const zip = await listZip(result.zip);
    expect(result.processed).toBe(5); expect(result.failures).toHaveLength(0); expect(zip.names).toEqual(playlist.tracks.map((track) => formatTrackFilename(track)));
    expect(new TextDecoder().decode(Bun.spawnSync(["unzip", "-p", zip.archive, zip.names[3]]).stdout)).toBe("audio-3");
  });
  test("keeps successful files when one source lookup fails", async () => {
    const playlist = makePlaylist(5); const source: AudioSource = { getAudio: async (track) => { if (track.playlistPosition === 2) throw new Error("missing"); return new Blob([`audio-${track.playlistPosition}`]); } };
    const result = await processPlaylist(playlist, source); expect(result.processed).toBe(4); expect(result.failures).toHaveLength(1); expect((await listZip(result.zip)).names).toHaveLength(4);
  });
  test("limits 100-track processing to three concurrent source requests", async () => {
    const playlist = makePlaylist(100); let active = 0, highest = 0;
    const source: AudioSource = { getAudio: async (track) => { active++; highest = Math.max(highest, active); await Bun.sleep(2); active--; return new Blob([String(track.playlistPosition)]); } };
    const result = await processPlaylist(playlist, source); expect(result.processed).toBe(100); expect(highest).toBe(3); expect((await listZip(result.zip)).names).toHaveLength(100);
  });
  test("processes a 500-track playlist with the same three-worker ceiling", async () => {
    const playlist = makePlaylist(500); let active = 0; let highest = 0;
    const source: AudioSource = { getAudio: async () => { active++; highest = Math.max(highest, active); await Bun.sleep(1); active--; return new Blob(["audio"]); } };
    const result = await processPlaylist(playlist, source); expect(result.processed).toBe(500); expect(highest).toBe(3); expect((await listZip(result.zip)).names).toHaveLength(500);
  });
  test("detects a missing or ambiguously named local MP3 rather than reusing another file", async () => {
    const playlist = makePlaylist(5); const files = playlist.tracks.slice(0, 4).map((track) => new File(["audio"], `${track.artists[0].name} - ${track.album.name} - ${track.name}.mp3`, { type: "audio/mpeg" }));
    const result = await processPlaylist(playlist, new LocalAudioSource(files)); expect(result.processed).toBe(4); expect(result.failures).toHaveLength(1); expect(result.failures[0].reason).toContain("não encontrado");
  });
  test("creates valid UTF-8 ZIPs with 10, 50 and 100 entries", async () => {
    for (const count of [10, 50, 100]) { const zip = await createZip(Array.from({ length: count }, (_, index) => ({ name: `${index === 0 ? "Ártist - Álbum - 01 - Música" : index === 4 ? "Beyoncé - Renaissance - 05 - Cuff It" : index === 9 ? "João - Álbum Especial - 10 - Música Teste" : `Artist - Album - ${index + 1} - Song`}.mp3`, blob: new Blob([`content-${index}`]) }))); const { names } = await listZip(zip); expect(names).toHaveLength(count); }
  });
});
