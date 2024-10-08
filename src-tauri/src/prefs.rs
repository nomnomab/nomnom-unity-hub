use std::path::PathBuf;

use crate::{app::{self, AppState}, errors};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum PrefsKey {
    HubPath,
    HubEditorsPath,
    HubAppDataPath,
    NewProjectPath,
    ProjectSortType
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
    pub project_sort_type: Option<crate::project::SortType>
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            new_project_path: Some(dirs_next::document_dir().unwrap()),

            #[cfg(target_os = "windows")]
            hub_path: Some(PathBuf::from("C:").join("Program Files").join("Unity Hub").join("Unity Hub").with_extension("exe")),
            #[cfg(target_os = "macos")]
            hub_path: Some(PathBuf::from("/Applications/Unity Hub.app")),
            #[cfg(target_os = "linux")]
            hub_path: Some(PathBuf::from("~/Applications/Unity/Hub.AppImage")),
            #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
            hub_path: None,

            #[cfg(target_os = "windows")]
            hub_editors_path: Some(PathBuf::from("C:").join("Program Files").join("Unity").join("Hub").join("Editor")),
            #[cfg(target_os = "macos")]
            hub_editors_path: Some(PathBuf::from("/Applications/Unity/Hub/Editor")),
            #[cfg(target_os = "linux")]
            hub_editors_path: Some(PathBuf::from("/Applications/Unity/Hub/Editor/")),
            #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
            hub_editors_path: None,

            hub_appdata_path: Some(dirs_next::config_dir().unwrap().join("UnityHub")),

            project_sort_type: None
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
pub fn cmd_set_pref_value(app_handle: tauri::AppHandle, app_state: tauri::State<'_, AppState>, key: PrefsKey, value: serde_json::Value) -> Result<(), errors::AnyError> {
    // let mut prefs = app::get_prefs(&app_state)?;
    let mut prefs = app_state.prefs.lock()
        .map_err(|_| errors::str_error("Failed to get prefs. Is it locked?"))?;

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
        PrefsKey::ProjectSortType => {
            prefs.project_sort_type = serde_json::from_value(value)?;
        },
        // _ => return Err(errors::str_error("Invalid key")),
    }

    app::save_prefs_to_disk(&prefs, &app_handle)?;
    
    Ok(())
}