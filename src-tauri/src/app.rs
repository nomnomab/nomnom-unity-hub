use std::{path::PathBuf, sync::Mutex};

use crate::{cache, editor, errors, prefs, project};

pub struct AppState {
    pub prefs: Mutex<prefs::Prefs>,
    pub user_cache: Mutex<cache::UserCache>,
    pub projects: Mutex<Vec<project::Project>>,
    pub editors: Mutex<Vec<editor::UnityEditorInstall>>,
}

pub fn get_save_path(name: &str, app_handle: &tauri::AppHandle) -> anyhow::Result<PathBuf> {
    let config = app_handle.config();
    let config_dir = tauri::api::path::app_config_dir(&config)
        .expect("failed to get app config dir");

    std::fs::create_dir_all(&config_dir)?;

    let path = config_dir.join(name).with_extension("json");
    Ok(path)
}

pub fn load_from_disk<T>(path: impl Into<PathBuf>) -> anyhow::Result<T>
    where T: Default + serde::Serialize + serde::de::DeserializeOwned {
    let path = path.into();
    let json = std::fs::read_to_string(&path)
        .unwrap_or("{}".to_string());
    let (exists, field) = match serde_json::from_str(&json) {
        Ok(field) => (true, field),
        Err(_) => (false, T::default()),
    };

    if !exists {
        save_to_disk::<T>(path, &field)?;
    }

    Ok(field)
}

pub fn save_new_to_disk<T>(path: impl Into<PathBuf>) -> anyhow::Result<T>
    where T: Default + serde::Serialize {
    let value = T::default();
    save_to_disk(path, &value)?;
    Ok(value)
}

pub fn save_to_disk<T>(path: impl Into<PathBuf>, field: &T) -> anyhow::Result<()>
    where T: serde::Serialize {
    let path = path.into();
    let json = serde_json::to_string_pretty(&field)?;
    std::fs::write(path, json)?;
    Ok(())
}

// prefs

pub fn get_prefs_save_path(app_handle: &tauri::AppHandle) -> anyhow::Result<PathBuf> {
    let path = get_save_path("prefs", app_handle)?;
    Ok(path)
}

pub fn get_prefs(app_state: &tauri::State<AppState>) -> anyhow::Result<prefs::Prefs> {
    let prefs = app_state.prefs.lock()
        .map_err(|_| errors::str_error("Failed to get prefs. Is it locked?"))?;

    Ok(prefs.clone())
}

pub fn load_prefs_from_disk(app_handle: &tauri::AppHandle) -> anyhow::Result<prefs::Prefs> {
    let path = get_prefs_save_path(app_handle)?;
    load_from_disk(&path)
}

pub fn save_new_prefs_to_disk(app_handle: &tauri::AppHandle) -> anyhow::Result<prefs::Prefs> {
    let path = get_prefs_save_path(app_handle)?;
    save_new_to_disk::<prefs::Prefs>(path)
}

pub fn save_prefs_to_disk(prefs: &prefs::Prefs, app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
    let path = get_prefs_save_path(app_handle)?;
    save_to_disk(path, prefs)?;
    Ok(())
}

// user cache

pub fn get_user_cache_save_path(app_handle: &tauri::AppHandle) -> anyhow::Result<PathBuf> {
    let path = get_save_path("user_cache", app_handle)?;
    Ok(path)
}

pub fn get_user_cache(app_state: &tauri::State<AppState>) -> anyhow::Result<cache::UserCache> {
    let user_cache = app_state.user_cache.lock()
        .map_err(|_| errors::str_error("Failed to get user_cache. Is it locked?"))?;

    Ok(user_cache.clone())
}

pub fn load_user_cache_from_disk(app_handle: &tauri::AppHandle) -> anyhow::Result<cache::UserCache> {
    let path = get_user_cache_save_path(app_handle)?;
    load_from_disk(&path)
}

pub fn save_new_user_cache_to_disk(app_handle: &tauri::AppHandle) -> anyhow::Result<cache::UserCache> {
    let path = get_user_cache_save_path(app_handle)?;
    save_new_to_disk::<cache::UserCache>(path)
}

pub fn save_user_cache_to_disk(user_cache: &cache::UserCache, app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
    let path = get_user_cache_save_path(app_handle)?;
    save_to_disk(path, &user_cache)
}

// projects

pub fn get_projects_save_path(app_handle: &tauri::AppHandle) -> anyhow::Result<PathBuf> {
    let path = get_save_path("projects", app_handle)?;
    Ok(path)
}

pub fn get_projects(app_state: &tauri::State<AppState>) -> anyhow::Result<Vec<project::Project>> {
    let projects = app_state.projects.lock()
        .map_err(|_| errors::str_error("Failed to get projects. Is it locked?"))?;

    Ok(projects.clone())
}

pub fn load_projects_from_disk(app_handle: &tauri::AppHandle) -> anyhow::Result<Vec<project::Project>> {
    let path = get_projects_save_path(app_handle)?;
    load_from_disk(&path)
}

pub fn save_new_projects_to_disk(app_handle: &tauri::AppHandle) -> anyhow::Result<Vec<project::Project>> {
    let path = get_projects_save_path(app_handle)?;
    save_new_to_disk::<Vec<project::Project>>(path)
}

pub fn save_projects_to_disk(projects: &Vec<project::Project>, app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
    let path = get_projects_save_path(app_handle)?;
    save_to_disk(path, &projects)
}

// editors

// pub fn get_editors_save_path(app_handle: &tauri::AppHandle) -> anyhow::Result<PathBuf> {
//     let path = get_save_path("editors", app_handle)?;
//     Ok(path)
// }

pub fn get_editors(app_state: &tauri::State<AppState>) -> anyhow::Result<Vec<editor::UnityEditorInstall>> {
    let editors = app_state.editors.lock()
        .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?;

    Ok(editors.clone())
}

// pub fn load_editors_from_disk(app_handle: &tauri::AppHandle) -> anyhow::Result<Vec<editor::UnityEditorInstall>> {
//     let path = get_editors_save_path(app_handle)?;
//     load_from_disk(&path)
// }

// pub fn save_new_editors_to_disk(app_handle: &tauri::AppHandle) -> anyhow::Result<Vec<editor::UnityEditorInstall>> {
//     let path = get_projects_save_path(app_handle)?;
//     save_new_to_disk::<Vec<editor::UnityEditorInstall>>(path)
// }

// pub fn save_editors_to_disk(editors: &Vec<editor::UnityEditorInstall>, app_handle: &tauri::AppHandle) -> anyhow::Result<()> {
//     let path = get_editors_save_path(app_handle)?;
//     save_to_disk(path, &editors)
// }

// commands

#[tauri::command]
pub fn cmd_show_path_in_file_manager(path: String) {
    showfile::show_path_in_file_manager(path);
}