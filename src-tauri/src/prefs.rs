use std::path::PathBuf;

use crate::{app::{self, AppState}, errors, project::Project};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum PrefsKey {
    HubPath,
    HubEditorsPath,
    HubAppDataPath,
    NewProjectPath,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Prefs {
    // where new projects are created
    pub new_project_path: Option<PathBuf>,
    // typically C:\Program Files\Unity Hub\Unity Hub.exe
    pub hub_path: Option<PathBuf>,
    // typically C:\Program Files\Unity\Hub\Editor
    pub hub_editors_path: Option<PathBuf>,
    // typically C:\Users\nomno\AppData\Roaming\UnityHub\
    pub hub_appdata_path: Option<PathBuf>,
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            new_project_path: Some(dirs_next::document_dir().unwrap()),
            // hub_path: Some(PathBuf::from(r#"C:\Program Files\Unity Hub\Unity Hub.exe"#)),
            hub_path: Some(PathBuf::from("C:").join("Program Files").join("Unity Hub").join("Unity Hub").with_extension("exe")),
            // hub_editors_path: Some(PathBuf::from(r#"C:\Program Files\Unity\Hub\Editor"#)),
            hub_editors_path: Some(PathBuf::from("C:").join("Program Files").join("Unity").join("Hub").join("Editor")),
            hub_appdata_path: Some(dirs_next::config_dir().unwrap().join("UnityHub")),
        }
    }
}

// commands

#[tauri::command]
pub fn cmd_get_prefs(app_state: tauri::State<AppState>) -> Result<Prefs, errors::AnyError> {
    let prefs = app::get_prefs(&app_state)?;
    Ok(prefs.clone())
}

#[tauri::command]
pub fn cmd_set_prefs(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>, prefs: Prefs) -> Result<(), errors::AnyError> {
    let mut lock = app_state.prefs.lock()
        .map_err(|_| errors::str_error("Failed to get prefs. Is it locked?"))?;
    *lock = prefs.clone();
    app::save_new_prefs_to_disk(&app_handle)?;
    Ok(())
}

#[tauri::command]
pub fn cmd_load_prefs(app_handle: tauri::AppHandle, app_state: tauri::State<'_, AppState>) -> Result<Prefs, errors::AnyError> {
    let disk_prefs = app::load_prefs_from_disk(&app_handle)?;
    let mut lock = app_state.prefs.lock()
        .map_err(|_| errors::str_error("Failed to get prefs. Is it locked?"))?;
    *lock = disk_prefs.clone();
    Ok(disk_prefs)
}

#[tauri::command]
pub fn cmd_save_prefs(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>) -> Result<(), errors::AnyError> {
    let prefs = app::get_prefs(&app_state)?;
    app::save_prefs_to_disk(&prefs, &app_handle)?;
    Ok(())
}

#[tauri::command]
pub fn cmd_set_pref_value(app_state: tauri::State<'_, AppState>, key: PrefsKey, value: serde_json::Value) -> Result<(), errors::AnyError> {
    let mut prefs = app::get_prefs(&app_state)?;
    match key {
        PrefsKey::NewProjectPath => {
            prefs.new_project_path = serde_json::from_value(value)?;
        },
        PrefsKey::HubPath => {
            prefs.hub_path = serde_json::from_value(value)?;
        },
        PrefsKey::HubEditorsPath => {
            prefs.hub_editors_path = serde_json::from_value(value)?;
        },
        PrefsKey::HubAppDataPath => {
            prefs.hub_appdata_path = serde_json::from_value(value)?;
        },
        _ => return Err(errors::str_error("Invalid key")),
    }
    Ok(())
}