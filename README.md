# Fudge

Fudge is a Windows desktop focus companion. Its always-on-top island helps you set a concrete task, check in while you work, and get a gentle reminder when it clearly detects a distraction. You choose when a focus session starts and stops, and whether to share a screen.

## The problem Fudge is designed to solve

It can be hard to return to a chosen task after interruptions or distractions. Fudge gives a work or personal task a little structure: it helps turn the task into a short plan, checks for clear signs of distraction during an opt-in focus session, and reminds you what you chose to do. The small desktop island keeps the session and its controls nearby.

Fudge is a lightweight aid for attention and task follow-through. It is not a medical tool, a time tracker, an employee monitoring system, or a guarantee that you will complete a task.

## What you can do

- Start Focus Mode for a specific task, such as “read two chapters” or “prepare my presentation.”
- Choose whether to show a live camera preview. Camera access is requested when Focus Mode starts; camera stills are used for checks whether or not the preview is shown.
- Optionally share a screen or window through the system picker. You can continue with camera checks only.
- Receive a short task plan and a task-related visual cue when the session starts.
- Get a spoken reply when voice feedback is enabled. Push and hold the island control to dictate a command.
- Stop Focus Mode at any time. Stopping ends camera and screen capture.
- Use the island to see and control supported Windows media sessions, and adjust appearance and voice feedback in Settings.

Fudge also supports general questions and web searches. For current events or explicit searches, it queries Bing RSS, summarizes the returned titles and snippets, and opens the top result in your browser. A one-time screen reading request is also available from chat through the system picker. These are secondary features; Focus Mode is the main purpose of the app.

## Use Focus Mode

1. Open the Fudge island and expand it.
2. Type a command such as `Start focus mode for reading a chapter and taking notes`. You can also hold the island’s round control to speak a command.
3. Choose whether to show the live camera preview by replying `yes` or `no`.
4. Enter a specific task when Fudge asks what you want to focus on. Fudge checks that the task is usable before continuing.
5. Choose whether to share a screen. Reply `yes` to open the Windows screen or window picker, or `no` to continue with camera checks only.
6. Work on the task. Fudge captures camera stills and, if you shared a screen, screen stills every 15 seconds for focus checks. A clearly on-task shared screen suppresses a distraction reminder. Ambiguous images do not trigger one. Reminders are limited so they do not repeat more than once per minute.
7. Say or type `Stop focus mode` when you are done. Fudge confirms that monitoring has stopped.

If Fudge cannot access the camera, check Windows Privacy settings for camera access for desktop apps, make sure a camera is connected, and close other apps that may be using it. Screen sharing can be declined or ended from the system picker; ending it leaves camera checks running until you stop Focus Mode.

## AI models and services

AI requests go through the hosted `/api/focus` route. The Meta API key stays on the server and is not included in the desktop app.

| Model or service | How Fudge uses it |
| --- | --- |
| Muse Spark (`muse-spark-1.3`) | Validates the focus task, reviews camera and shared-screen stills, answers chat questions, and describes a generated focus image. |
| SAM 3.1 (`sam-3.1`) | Looks for a smartphone in camera stills. Its result is one input to the focus check, not a standalone judgment. |
| Muse Wonder (`muse-wonder-1.0`) | Creates a short practical plan for the selected task. |
| Muse Image (`muse-image-1.0`) | Generates a wordless visualization related to the focus task. Muse Spark then provides a brief spoken cue for it. |
| Muse Voice Transcribe (`muse-voice-transcribe-1.0`) | Transcribes push-to-talk audio. The audio is discarded after transcription; the transcript is handled as a chat command and remains in local chat history. |
| Bing RSS | Supplies result titles and snippets for current-events questions and explicit web searches. Muse Spark summarizes the returned evidence. |

Model names describe the services currently called by the server implementation and may change as the project evolves.

## Privacy and limitations

- Camera and screen capture are used only after you start Focus Mode and grant or select access. Screen sharing is optional.
- Still images are captured locally, sent to the hosted proxy for analysis, and are not saved by Fudge. They are not retained in local chat history.
- Your focus task is sent with focus checks and is also used to create the plan and visual cue.
- Push-to-talk audio is sent to the proxy for transcription and discarded after transcription. The resulting text can appear in the on-device chat history.
- Chat messages and settings are stored in browser storage on this device. There is no Fudge account or synchronization service.
- Focus checks are best-effort and intentionally conservative. The camera check looks for clearly unrelated activity, such as phone use; it does not infer attention from gaze, posture, or identity. A camera image alone cannot establish that you are on task.
- The hosted proxy currently uses a best-effort in-memory per-IP request limit. It does not authenticate individual users.

Do not use Fudge to monitor another person without their knowledge and consent. Avoid entering sensitive information into tasks or chat unless you are comfortable sending it to the configured hosted AI service.

## Download and install

Download Fudge for Windows:

- [Download the recommended setup installer (.exe)](public/downloads/Fudge_0.1.0_x64-setup.exe)
- [Download the Windows Installer (.msi)](public/downloads/Fudge_0.1.0_x64_en-US.msi)

The setup installer is recommended for most users. Run the installer and then launch Fudge; the island is designed to stay above other windows. Installed production builds register Fudge to start automatically with Windows.

## Requirements

- Windows desktop environment supported by Tauri 2 and its WebView2 runtime.
- A working camera for Focus Mode. Screen sharing is optional.
- Internet access and a configured hosted Fudge proxy for AI features.
- For building from source: Node.js/npm, Rust 1.90 or newer, and the Windows build tools required by Tauri.

## Developer setup

Install JavaScript dependencies:

```bash
npm install
```

Create a `.env` file for local web development and set the Meta API key:

```dotenv
META_API_KEY=your_meta_api_key
```

Keep this key server-side. Do not add it to `NEXT_PUBLIC_*` variables or commit it to source control.

Run the web app:

```bash
npm run dev
```

The site uses the same-origin `/api/focus` route in local web development. The `/home` page is the download page with a visual demo island; that website demo is illustrative and does not run the desktop Focus Mode flow.

Run the desktop app in development:

```bash
npm run tauri dev
```

Desktop builds call a deployed proxy because the static desktop bundle cannot host the API route. Set the proxy URL before building:

```dotenv
NEXT_PUBLIC_FOCUS_PROXY_URL=https://your-domain.example/api/focus
```

Build the Windows installers:

```bash
npm run build:tauri
npm run tauri build
```

`npm run build:tauri` creates the static frontend assets for Tauri. `npm run tauri build` packages the desktop application and installers.

## Deploy the hosted proxy

Deploy the Next.js app to a server that supports the route handler, such as Vercel, and configure:

- `META_API_KEY`: Meta API credential, stored only in the server environment.
- `FOCUS_ALLOWED_ORIGINS`: optional comma-separated list of production browser origins that may call the route. Tauri and localhost origins are included by default.

For desktop releases, build with `NEXT_PUBLIC_FOCUS_PROXY_URL` set to the deployed `/api/focus` endpoint. The proxy applies a best-effort in-memory limit of 24 requests per IP per minute; configure platform-level rate limiting before broad distribution. The app has no user accounts, so this is not per-user authentication.

## Technology stack

- **Desktop shell:** Tauri 2 with a Rust native layer. Windows integrations provide installed-app commands and Windows media-session controls.
- **UI:** Next.js 16 with React 19 and TypeScript; Tailwind CSS 4 for styling.
- **Desktop delivery:** Tauri static frontend export, packaged as Windows installers.
- **AI and server API:** Next.js route handler calling Meta APIs from the server.
- **Local persistence:** browser local storage for chat history, settings, and island position.
- **External search:** Bing RSS for current-events and explicit web searches.

## Project scope

Fudge is currently a single-user Windows desktop island focused on task-specific focus sessions. It combines optional camera and screen checks with a lightweight chat interface, voice input, spoken replies, and desktop media controls. The website is primarily a download page and illustrative demo.

The current app does not provide accounts, cloud sync, team administration, productivity analytics, guaranteed distraction detection, or cross-platform desktop support. Focus checks depend on camera availability, user permissions, network connectivity, and the hosted AI service.
