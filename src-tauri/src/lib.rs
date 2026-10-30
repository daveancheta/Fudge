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
                println!("registered for autostart? {}", autostart_manager.is_enabled().unwrap());
                // Disable autostart
                let _ = autostart_manager.disable();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_installed_apps,
            launch_installed_app,
            get_spotify_playback
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
        }