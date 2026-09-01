import type { SpotifyPlaylist, SpotifyTrack } from "@/types/spotify";

// Temporary token for local testing only. In production use OAuth PKCE; never persist tokens in localStorage.
const SPOTIFY_API = process.env.NEXT_PUBLIC_SPOTIFY_API ?? "";
const API_BASE = "https://api.spotify.com/v1";

type SpotifyApiTrack = { track: { id: string; name: string; artists: { name: string }[]; album: { name: string }; track_number: number } | null };
type Page = { items: SpotifyApiTrack[]; next: string | null };

async function spotifyFetch<T>(path: string): Promise<T> {
  if (!SPOTIFY_API) throw new Error("Configure NEXT_PUBLIC_SPOTIFY_API com um token OAuth temporário para buscar os metadados.");
  const response = await fetch(path, { headers: { Authorization: `Bearer ${SPOTIFY_API}` } });
  if (response.status === 404) throw new Error("Não foi possível encontrar essa playlist.");
  if (!response.ok) throw new Error("Não foi possível obter os dados da playlist no Spotify.");
  return response.json() as Promise<T>;
}

export async function getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  const metadata = await spotifyFetch<{ id: string; name: string }>(`${API_BASE}/playlists/${playlistId}?fields=id,name`);
  const tracks = await getPlaylistTracks(playlistId);
  if (!tracks.length) throw new Error("A playlist não possui faixas.");
  return { ...metadata, tracks };
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  let next: string | null = `${API_BASE}/playlists/${playlistId}/tracks?limit=100&offset=0&fields=items(track(id,name,artists(name),album(name),track_number)),next`;
  const tracks: SpotifyTrack[] = [];
  while (next) {
    const page: Page = await spotifyFetch<Page>(next);
    page.items.forEach(({ track }) => { if (track?.id) tracks.push({ id: track.id, name: track.name, artists: track.artists, album: track.album, trackNumber: track.track_number, playlistPosition: tracks.length }); });
    next = page.next;
  }
  return tracks;
}
