"use client";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LocalAudioSource } from "@/services/audio";
import { getPlaylist } from "@/services/spotify";
import { downloadBlob } from "@/services/zip";
import { processPlaylist } from "@/services/process";
import { formatTrackFilename, formatZipFilename } from "@/utils/filename";
import { estimateRemainingTime, formatElapsedTime } from "@/utils/formatTime";
import { validateSpotifyUrl } from "@/utils/spotify";
import type { GenerationState, ProcessingFailure, SpotifyPlaylist, SpotifyTrack } from "@/types/spotify";
import * as S from "./HomeDetails";

const displayTrack = (track: SpotifyTrack) => `${track.artists.map((artist) => artist.name).join(", ")} — ${track.album.name} — ${track.name}`;
export default function Home() {
  const [url, setUrl] = useState(""); const [files, setFiles] = useState<File[]>([]); const [state, setState] = useState<GenerationState>("idle");
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null); const [done, setDone] = useState(0); const [current, setCurrent] = useState<SpotifyTrack | null>(null); const [failures, setFailures] = useState<ProcessingFailure[]>([]); const [zip, setZip] = useState<Blob | null>(null); const [startedAt, setStartedAt] = useState<number | null>(null); const [error, setError] = useState(""); const cancelled = useRef(false);
  useEffect(() => () => { cancelled.current = true; }, []);
  const eta = useMemo(() => startedAt && playlist ? estimateRemainingTime(startedAt, done, playlist.tracks.length) : null, [startedAt, done, playlist]);
  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => setFiles(Array.from(event.target.files ?? []));
  async function processTracks(data: SpotifyPlaylist, suppliedFiles: File[]) {
    if (!suppliedFiles.length) throw new Error("Selecione os arquivos MP3 autorizados antes de gerar o pacote.");
    const result = await processPlaylist(data, new LocalAudioSource(suppliedFiles), { concurrency: 3, onProgress: (completed, track) => { setCurrent(track); setDone(completed); } });
    if (cancelled.current) return;
    setFailures(result.failures); setZip(result.zip); setState("completed");
    if (result.failures.length) toast.warning(`${result.failures.length} faixa(s) não puderam ser processadas.`);
    toast.success("ZIP criado com sucesso.");
  }
  async function submit(event: FormEvent) { event.preventDefault(); cancelled.current = false; setError(""); setZip(null); setFailures([]); setDone(0); setCurrent(null); const validation = validateSpotifyUrl(url); if (!validation.valid) { toast.error(validation.message); return; } if (!files.length) { const message = "Selecione os arquivos MP3 autorizados antes de gerar o pacote."; setError(message); toast.error(message); return; } try { setState("loading"); const data = await getPlaylist(validation.playlistId!); if (cancelled.current) return; setPlaylist(data); toast.success(`${data.tracks.length} faixas encontradas.`); setState("processing"); setStartedAt(Date.now()); toast.message("Processamento iniciado."); await processTracks(data, files); } catch (cause) { if (!cancelled.current) { const message = cause instanceof Error ? cause.message : "Ocorreu um erro inesperado."; setError(message); setState("error"); toast.error(message); } } }
  const isWorking = state === "loading" || state === "processing"; const progress = playlist ? Math.round((done / playlist.tracks.length) * 100) : 0;
  return <S.Page><S.Card><S.Brand>MySpotlight</S.Brand><S.Subtitle>Transforme sua playlist em um pacote organizado.</S.Subtitle><S.Form onSubmit={submit}><S.HiddenLabel htmlFor="playlist-url">URL da playlist do Spotify</S.HiddenLabel><S.UrlInput id="playlist-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Cole aqui a URL da playlist do Spotify..." disabled={isWorking} required /><S.FileLabel>Selecionar arquivos MP3 autorizados ({files.length})<S.FileInput type="file" accept="audio/mpeg,.mp3" multiple onChange={selectFiles} disabled={isWorking} /></S.FileLabel><S.Button type="submit" disabled={isWorking}>{state === "loading" ? "BUSCANDO..." : state === "processing" ? "GERANDO..." : "GERAR"}</S.Button></S.Form>{(state === "loading" || state === "processing") && <S.Status aria-live="polite"><S.StatusTitle>Status da geração</S.StatusTitle>{state === "loading" ? <S.Processing><S.Loading>Buscando os metadados da playlist…</S.Loading></S.Processing> : <><S.ProgressTrack aria-label={`${progress}% concluído`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><S.ProgressFill $progress={progress} /></S.ProgressTrack><S.Row><span>{done} de {playlist?.tracks.length} faixas</span><strong>{progress}%</strong></S.Row>{current && <S.Processing>Processando: <strong>{displayTrack(current)}</strong></S.Processing>}<S.Hint>Tempo estimado restante: {eta === null ? "Calculando estimativa..." : formatElapsedTime(eta)}</S.Hint></>}</S.Status>}{state === "completed" && playlist && <S.Status><S.Success><h2>Playlist concluída!</h2><p>{done - failures.length} de {playlist.tracks.length} faixas adicionadas.</p><p className="total">Tempo total: {startedAt ? formatElapsedTime(Date.now() - startedAt) : "—"}</p><S.Button type="button" onClick={() => zip && downloadBlob(zip, formatZipFilename(playlist.name))}>BAIXAR ZIP</S.Button>{failures.length > 0 && <><S.Hint>{failures.length} faixa(s) não puderam ser processadas.</S.Hint><S.Failures>{failures.map(({ track }) => <li key={track.id}>{String(track.playlistPosition + 1).padStart(2, "0")} — {displayTrack(track)}</li>)}</S.Failures></>}</S.Success></S.Status>}{state === "error" && <S.ErrorText role="alert">{error} Corrija o problema e tente novamente.</S.ErrorText>}<S.LegalNote>O MySpotlight usa o Spotify apenas para metadados. Seus arquivos de áudio permanecem no seu dispositivo e devem ser arquivos que você está autorizado a usar.</S.LegalNote></S.Card></S.Page>;
}
