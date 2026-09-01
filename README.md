# MySpotlight

MySpotlight reads **Spotify playlist metadata** and packages matching, user-selected MP3 files into a local ZIP. Spotify is never used as an audio source and the application does not bypass DRM or download protected audio. Selected MP3s remain on the user's device.

## Run locally

1. Create `.env.local` with an OAuth access token that is valid for the playlists you need:

   ```env
   SPOTIFY_API=your-temporary-oauth-access-token
   ```

   `SPOTIFY_API` is read only by the local Next.js route handler. Do not use `NEXT_PUBLIC_` for this token and do not commit the file.
2. Run `bun run dev`.
3. Paste a public/authorized Spotify playlist URL, select the corresponding authorized local MP3s, and generate the ZIP.

## Architecture

- `services/spotify.ts`: browser client for playlist metadata via the local `/api/spotify` proxy.
- `app/api/spotify/[...path]/route.ts`: local Next.js Node runtime proxy that attaches `SPOTIFY_API`; it does not receive audio files.
- `services/audio.ts`: `AudioSource` abstraction and safe local MP3 matching.
- `services/process.ts`: three-worker queue, progress callbacks, per-track failures, and ZIP orchestration.
- `services/zip.ts`: browser-local, standards-compliant ZIP writer with CRC-32 and UTF-8 names.

## Checks

```bash
bunx tsc --noEmit
bun test
bun run build
bun run lint
```

`bun run lint` is currently blocked by the project-pinned TypeScript 7.0.2: the `typescript-eslint` version shipped transitively by `eslint-config-next` rejects TypeScript 7. A downgrade to TypeScript 6 was attempted but the environment's npm registry returned HTTP 403. Type-checking and the automated Bun tests remain available; update the TypeScript/ESLint dependency pair once the registry is available.
