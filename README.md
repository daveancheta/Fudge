# Fudge

Fudge is a Windows desktop island for music playback and quick app commands. Settings and chat history stay on this device.

## Focus mode

Start a session by typing or saying `start focus mode for <task>` in the island. Say or type `stop focus mode` to end it. Focus mode requests camera access only after activation, captures a low-resolution still every minute, and sends each still with the task through the hosted Meta proxy for visible distraction checks. The camera cannot see the user's screen, and ambiguous images do not trigger a nudge. The task goal and push-to-talk audio also go to Meta; audio is converted to a transcript and discarded. Fudge does not save camera stills. The transcript remains in the existing on-device chat history.

The proxy uses Muse Voice Transcribe for push-to-talk, Muse Wonder for a short task plan, Muse Image for a generated visualization that Muse Spark turns into a spoken cue, and SAM 3.1 plus Muse Spark for visible distraction checks. The optional live camera preview is shown in the island, and reminders are spoken aloud.

### Configure the hosted proxy

- Set `META_API_KEY` in the Vercel project’s server environment. Keep it off the client and out of the desktop bundle.
- For desktop builds, set `NEXT_PUBLIC_FOCUS_PROXY_URL` to the deployed function URL, such as `https://your-domain.example/api/focus`, before running `npm run build:tauri`.
- Add any production browser origin to `FOCUS_ALLOWED_ORIGINS` as a comma-separated list. Tauri and localhost origins are already allowed.

The local development server and deployed site use their same-origin `/api/focus` route by default, which reads `META_API_KEY` from the server environment. The desktop client requires a deployed proxy URL, so set `NEXT_PUBLIC_FOCUS_PROXY_URL` before building it.

The proxy has a best-effort per-IP in-memory limit. Before distributing it broadly, configure Vercel Firewall rate limits for `/api/focus`; the desktop app has no account system to authenticate individual users.

## Development

```bash
npm install
npm run dev
```

## Build the desktop app

```bash
npm run build:tauri
npm run tauri build
```
