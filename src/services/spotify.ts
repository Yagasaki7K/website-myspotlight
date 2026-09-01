import type { SpotifyPlaylist, SpotifyTrack } from "@/types/spotify";

type SpotifyApiTrack = { track: { id: string; name: string; artists: { name: string }[]; album: { name: string }; track_number: number } | null };
type Page = { items: SpotifyApiTrack[]; next: string | null };

async function spotifyFetch<T>(path: string): Promise<T> {
  const response = await fetch(`/api/spotify/${path}`, { cache: "no-store" });
  if (response.status === 404) throw new Error("Não foi possível encontrar essa playlist.");
  if (response.status === 401 || response.status === 403) throw new Error("Esta playlist é privada ou não está acessível com a credencial configurada.");
  if (response.status === 503) throw new Error("Configure SPOTIFY_API no ambiente local do Next.js.");
  if (!response.ok) throw new Error("Não foi possível obter os dados da playlist no Spotify.");
  return response.json() as Promise<T>;
}

export async function getPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  const metadata = await spotifyFetch<{ id: string; name: string }>(`playlists/${playlistId}?fields=id,name`);
  const tracks = await getPlaylistTracks(playlistId);
  if (!tracks.length) throw new Error("A playlist não possui faixas.");
  return { ...metadata, tracks };
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  let next = `playlists/${playlistId}/tracks?limit=100&offset=0&fields=items(track(id,name,artists(name),album(name),track_number)),next`;
  const tracks: SpotifyTrack[] = [];
  while (next) { const page: Page = await spotifyFetch<Page>(next); page.items.forEach(({ track }) => { if (track?.id) tracks.push({ id: track.id, name: track.name, artists: track.artists, album: track.album, trackNumber: track.track_number, playlistPosition: tracks.length }); }); next = page.next ? page.next.replace("https://api.spotify.com/v1/", "") : ""; }
  return tracks;
}
