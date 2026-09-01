export interface SpotifyArtist { name: string }

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: { name: string };
  trackNumber: number;
  playlistPosition: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  tracks: SpotifyTrack[];
}

export type GenerationState = "idle" | "loading" | "processing" | "completed" | "error";

export interface ProcessingFailure { track: SpotifyTrack; reason: string }
