use std::process::Command;
use tauri::Manager;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct InstalledApp {
    id: String,
    name: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyPlayback {
    title: String,
    artist: String,
    artwork: Option<String>,
}

fn encode_base64(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut encoded = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let first = chunk[0];
        let second = *chunk.get(1).unwrap_or(&0);
        let third = *chunk.get(2).unwrap_or(&0);
        encoded.push(TABLE[(first >> 2) as usize] as char);
        encoded.push(TABLE[(((first & 0b11) << 4) | (second >> 4)) as usize] as char);
        encoded.push(if chunk.len() > 1 {
            TABLE[(((second & 0b1111) << 2) | (third >> 6)) as usize] as char
        } else {
            '='
        });
        encoded.push(if chunk.len() > 2 {
            TABLE[(third & 0b111111) as usize] as char
        } else {
            '='
        });
    }
    encoded
}

#[tauri::command]
fn get_spotify_playback() -> Result<Option<SpotifyPlayback>, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::{
            Media::Control::{
                GlobalSystemMediaTransportControlsSessionManager,
                GlobalSystemMediaTransportControlsSessionPlaybackStatus,
            },
            Storage::Streams::DataReader,
            Win32::System::WinRT::{RO_INIT_MULTITHREADED, RoInitialize, RoUninitialize},
        };

        return std::thread::spawn(|| {
            let result = (|| -> windows::core::Result<Option<SpotifyPlayback>> {
                unsafe {
                    RoInitialize(RO_INIT_MULTITHREADED)?;
                }
                struct WinRtApartment;
                impl Drop for WinRtApartment {
                    fn drop(&mut self) {
                        unsafe {
                            RoUninitialize();
                        }
                    }
                }
                let _apartment = WinRtApartment;

                let manager =
                    GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.join()?;
                let sessions = manager.GetSessions()?;
                for index in 0..sessions.Size()? {
                    let session = sessions.GetAt(index)?;
                    if !session
                        .SourceAppUserModelId()?
                        .to_string_lossy()
                        .to_lowercase()
                        .contains("spotify")
                    {
                        continue;
                    }
                    let playback = session.GetPlaybackInfo()?;
                    if playback.PlaybackStatus()?
                        != GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing
                    {
                        continue;
                    }

                    let properties = session.TryGetMediaPropertiesAsync()?.join()?;
                    let title = properties.Title()?.to_string_lossy();
                    let artist = properties.Artist()?.to_string_lossy();
                    let artwork = properties
                        .Thumbnail()
                        .ok()
                        .and_then(|reference| reference.OpenReadAsync().ok()?.join().ok())
                        .and_then(|stream| {
                            let size = stream.Size().ok()?.min(1_000_000) as u32;
                            if size == 0 {
                                return None;
                            }
                            let content_type = stream.ContentType().ok()?.to_string_lossy();
                            let input = stream.GetInputStreamAt(0).ok()?;
                            let reader = DataReader::CreateDataReader(&input).ok()?;
                            reader.LoadAsync(size).ok()?.join().ok()?;
                            let mut bytes = vec![0; size as usize];
                            reader.ReadBytes(&mut bytes).ok()?;
                            Some(format!(
                                "data:{content_type};base64,{}",
                                encode_base64(&bytes)
                            ))
                        });
                    return Ok(Some(SpotifyPlayback {
                        title,
                        artist,
                        artwork,
                    }));
                }
                Ok(None)
            })();
            result.map_err(|error| error.to_string())
        })
        .join()
        .map_err(|_| "Spotify playback detection stopped unexpectedly.".to_owned())?;
    }

    #[cfg(not(target_os = "windows"))]
    Ok(None)
}

#[tauri::command]
fn list_installed_apps() -> Result<Vec<InstalledApp>, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell")
      .args([
        "-NoProfile",
        "-Command",
        "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Compress",
      ])
      .output()
      .map_err(|error| format!("Could not list installed apps: {error}"))?;
        if !output.status.success() {
            return Err("Windows could not list Start menu apps.".into());
        }
        let value: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|error| format!("Could not read the installed app list: {error}"))?;
        let entries = value.as_array().cloned().unwrap_or_else(|| vec![value]);
        return Ok(entries
            .into_iter()
            .filter_map(|entry| {
                let name = entry.get("Name")?.as_str()?.trim();
                let id = entry.get("AppID")?.as_str()?.trim();
                (!name.is_empty() && !id.is_empty()).then(|| InstalledApp {
                    id: id.to_owned(),
                    name: name.to_owned(),
                })
            })
            .collect());
    }

    #[cfg(not(target_os = "windows"))]
    Err("Installed app discovery is currently available on Windows.".into())
}

#[tauri::command]
fn launch_installed_app(app_id: String) -> Result<String, String> {
    let app = list_installed_apps()?
        .into_iter()
        .find(|app| app.id == app_id)
        .ok_or_else(|| "That app is not in the installed app list.".to_owned())?;

    #[cfg(target_os = "windows")]
    {
        return Command::new("explorer.exe")
            .arg(format!("shell:AppsFolder\\{}", app.id))
            .spawn()
            .map(|_| format!("Opening {}.", app.name))
            .map_err(|error| format!("Could not open {}: {error}", app.name));
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Opening installed apps is currently available on Windows.".into())
    }
}

#[tauri::command]
fn close_installed_app(app_id: String) -> Result<String, String> {
    let app = list_installed_apps()?
        .into_iter()
        .find(|app| app.id == app_id)
        .ok_or_else(|| "That app is not in the installed app list.".to_owned())?;

    #[cfg(target_os = "windows")]
    {
        let encoded_name = encode_base64(app.name.as_bytes());
        let script = format!(
            r#"
$appName = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{encoded_name}'))
function Normalize([string]$value) {{ [regex]::Replace($value.ToLowerInvariant(), '[^\p{{L}}\p{{N}}]', '') }}
$target = Normalize $appName
$terms = [regex]::Split($appName, '[^\p{{L}}\p{{N}}]+') | Where-Object {{ (Normalize $_).Length -ge 4 }}
$processes = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {{
    if ($_.MainWindowHandle -eq 0) {{ return $false }}
    $procName = Normalize $_.ProcessName
    $title = Normalize $_.MainWindowTitle
    $candidate = $procName -eq $target -or ($procName.Length -ge 4 -and $target.Contains($procName)) -or ($target.Length -ge 4 -and $procName.Contains($target)) -or ($target.Length -ge 4 -and $title.Contains($target))
    foreach ($term in $terms) {{
        $token = Normalize $term
        if ($procName.Contains($token) -or $title.Contains($token)) {{ $candidate = $true }}
    }}
    return $candidate
}})
if ($processes.Count -eq 0) {{ Write-Error 'No open window matched this app.'; exit 2 }}
$closed = @()
foreach ($process in $processes) {{ if ($process.CloseMainWindow()) {{ $closed += $process.ProcessName }} }}
if ($closed.Count -eq 0) {{ Write-Error 'Windows could not close a matching app window.'; exit 3 }}
Write-Output ("Close request sent to {{0}}." -f ($closed -join ', '))
"#
        );
        let encoded_script = encode_base64(
            &script
                .encode_utf16()
                .flat_map(u16::to_le_bytes)
                .collect::<Vec<_>>(),
        );

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-EncodedCommand",
                &encoded_script,
            ])
            .output()
            .map_err(|error| format!("Could not request {} to close: {error}", app.name))?;
        if !output.status.success() {
            let detail = String::from_utf8_lossy(&output.stderr).trim().to_owned();
            return Err(if detail.is_empty() {
                format!("I couldn't find {} running with an open window.", app.name)
            } else {
                detail
            });
        }
        return Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned());
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Closing installed apps is currently available on Windows.".into())
    }
}

#[tauri::command]
async fn open_settings(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window.show().map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let url = if cfg!(debug_assertions) {
        tauri::WebviewUrl::External(
            "http://localhost:3000/settings"
                .parse::<tauri::Url>()
                .map_err(|error| error.to_string())?,
        )
    } else {
        tauri::WebviewUrl::App("settings.html".into())
    };

    tauri::WebviewWindowBuilder::new(&app, "settings", url)
        .title("Fudge Settings")
        .inner_size(520.0, 440.0)
        .min_inner_size(440.0, 360.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_always_on_top(true)?;
            }
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;

                use tauri_plugin_autostart::MacosLauncher;
                use tauri_plugin_autostart::ManagerExt;

                app.handle().plugin(tauri_plugin_autostart::init(
                    MacosLauncher::LaunchAgent,
                    Some(vec!["--flag1", "--flag2"]),
                ));

                // Get the autostart manager
                let autostart_manager = app.autolaunch();
                // Enable autostart
                let _ = autostart_manager.enable();
                // Check enable state
                println!(
                    "registered for autostart? {}",
                    autostart_manager.is_enabled().unwrap()
                );
                // Disable autostart
                let _ = autostart_manager.disable();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_installed_apps,
            launch_installed_app,
            close_installed_app,
            get_spotify_playback,
            open_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
