import type { SpotifyTrack } from "@/types/spotify";

export interface AudioSource { getAudio(track: SpotifyTrack): Promise<Blob> }
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const contains = (value: string, phrase: string) => value.includes(phrase);

/** Local-only source: selected files are read and zipped in the browser, never uploaded. */
export class LocalAudioSource implements AudioSource {
  private readonly used = new Set<File>();
  constructor(private readonly files: File[]) {}
  async getAudio(track: SpotifyTrack): Promise<Blob> {
    const title = normalize(track.name); const artist = normalize(track.artists[0]?.name ?? ""); const album = normalize(track.album.name);
    const candidates = this.files.filter((file) => { const name = normalize(file.name.replace(/\.[^/.]+$/, "")); return !this.used.has(file) && contains(name, title) && contains(name, artist); });
    if (!candidates.length) throw new Error("Arquivo local correspondente não encontrado.");
    const albumMatches = candidates.filter((file) => contains(normalize(file.name), album));
    const matches = albumMatches.length ? albumMatches : candidates;
    if (matches.length !== 1) throw new Error("Mais de um arquivo local corresponde a esta faixa; renomeie-o para identificá-lo.");
    const file = matches[0];
    if (!file.name.toLowerCase().endsWith(".mp3") && file.type !== "audio/mpeg") throw new Error("Apenas arquivos MP3 são aceitos nesta versão.");
    this.used.add(file); return file;
  }
}
