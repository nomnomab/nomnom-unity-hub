// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::Context;

mod installs;
mod prefs;

#[tauri::command]
fn get_config_path(app: tauri::AppHandle) -> String {
    let config = app.config();
    let path = prefs::Prefs::get_config_path(&config);
    path.to_str().unwrap().to_string()
}

#[tauri::command]
fn show_path_in_file_manager(path: String) {
  showfile::show_path_in_file_manager(path);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_config_path, 
            show_path_in_file_manager,
            installs::get_editor_installs, 
            prefs::get_projects,
            prefs::add_project,
            prefs::remove_project,
            installs::open_project,
            installs::open_editor,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            
            if let Err(err) = setup(&handle) {
                println!("{:?}", err);
                return Err(err.into());
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup(app: &tauri::AppHandle) -> anyhow::Result<()> {
    prefs::setup(app).context("Failed to read settings")?;
    Ok(())
}