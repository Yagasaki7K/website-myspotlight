import type { SpotifyTrack } from "@/types/spotify";

export interface AudioSource { getAudio(track: SpotifyTrack): Promise<Blob> }

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Local-only audio source. Files never leave the browser. */
export class LocalAudioSource implements AudioSource {
  constructor(private readonly files: File[]) {}

  async getAudio(track: SpotifyTrack): Promise<Blob> {
    const terms = [track.name, ...track.artists.map((artist) => artist.name)].map(normalize);
    const file = this.files.find((candidate) => {
      const name = normalize(candidate.name.replace(/\.[^/.]+$/, ""));
      return terms.every((term) => name.includes(term));
    });
    if (!file) throw new Error("Arquivo local correspondente não encontrado.");
    if (!file.name.toLowerCase().endsWith(".mp3") && file.type !== "audio/mpeg") throw new Error("Apenas arquivos MP3 são aceitos nesta versão.");
    return file;
  }
}
