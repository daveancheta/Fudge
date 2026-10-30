use std::process::Command;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct InstalledApp {
  id: String,
  name: String,
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
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![list_installed_apps, launch_installed_app])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
