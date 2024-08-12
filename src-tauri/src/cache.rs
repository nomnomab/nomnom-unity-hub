use crate::{app::{self, AppState}, errors, package};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum UserCacheKey {
  LastEditorVersion,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserCache {
  pub last_editor_version: Option<String>,
  pub git_packages: Vec<package::MinimalPackage>,
  pub local_packages: Vec<package::MinimalPackage>,
}

impl Default for UserCache {
  fn default() -> Self {
    Self {
      last_editor_version: None,
      git_packages: Vec::new(),
      local_packages: Vec::new(),
    }
  }
}

// commands

#[tauri::command]
pub fn cmd_get_user_cache(app_handle: tauri::AppHandle, app_state: tauri::State<'_, AppState>) -> Result<UserCache, errors::AnyError> {
    //let user_cache = app::get_user_cache(&app_state)?;
    let mut user_cache = app_state.user_cache.lock()
      .map_err(|_| errors::str_error("Failed to get user_cache. Is it locked?"))?;

    user_cache.local_packages.retain(|x| std::path::Path::new(&x.name).exists());
    app::save_user_cache_to_disk(&user_cache, &app_handle)?;
    
    Ok(user_cache.clone())
}

#[tauri::command]
pub fn cmd_save_user_cache(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>) -> Result<(), errors::AnyError> {
    let user_cache = app::get_user_cache(&app_state)?;
    app::save_user_cache_to_disk(&user_cache, &app_handle)?;
    Ok(())
}

#[tauri::command]
pub fn cmd_set_user_cache_value(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>, key: UserCacheKey, value: serde_json::Value) -> Result<(), errors::AnyError> {
  let mut user_cache = app_state.user_cache.lock()
    .map_err(|_| errors::str_error("Failed to get user_cache. Is it locked?"))?;

  match key {
    UserCacheKey::LastEditorVersion => {
      user_cache.last_editor_version = serde_json::from_value(value).unwrap_or(None);
    }
    _ => return Err(errors::str_error("Invalid key")),
  }

  app::save_user_cache_to_disk(&user_cache, &app_handle)?;
  Ok(())
}

#[tauri::command]
pub fn cmd_add_git_package_to_cache(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>, package: package::MinimalPackage) -> Result<(), errors::AnyError> {
  let mut user_cache = app_state.user_cache.lock()
    .map_err(|_| errors::str_error("Failed to get user_cache. Is it locked?"))?;
  user_cache.git_packages.push(package);
  app::save_user_cache_to_disk(&user_cache, &app_handle)?;
  Ok(())
}

#[tauri::command]
pub fn cmd_add_local_package_to_cache(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>, package: package::MinimalPackage) -> Result<(), errors::AnyError> {
  let mut user_cache = app_state.user_cache.lock()
    .map_err(|_| errors::str_error("Failed to get user_cache. Is it locked?"))?;
  user_cache.local_packages.push(package);
  app::save_user_cache_to_disk(&user_cache, &app_handle)?;
  Ok(())
}

#[tauri::command]
pub fn cmd_remove_git_package_from_cache(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>, package: package::MinimalPackage) -> Result<(), errors::AnyError> {
  let mut user_cache = app_state.user_cache.lock()
    .map_err(|_| errors::str_error("Failed to get user_cache. Is it locked?"))?;
  user_cache.git_packages.retain(|p| p.name != package.name && p.version != package.version);
  app::save_user_cache_to_disk(&user_cache, &app_handle)?;
  Ok(())
}

#[tauri::command]
pub fn cmd_remove_local_package_from_cache(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>, package: package::MinimalPackage) -> Result<(), errors::AnyError> {
  let mut user_cache = app_state.user_cache.lock()
    .map_err(|_| errors::str_error("Failed to get user_cache. Is it locked?"))?;
  user_cache.local_packages.retain(|p| p.name != package.name);
  app::save_user_cache_to_disk(&user_cache, &app_handle)?;
  Ok(())
}

#[tauri::command]
pub fn cmd_delete_template_cache(app_handle: tauri::AppHandle) -> Result<(), errors::AnyError> {
  let cache_dir = app_handle.path_resolver().app_cache_dir()
    .ok_or(errors::str_error("Invalid app cache dir"))?
    .join("templates");

  std::fs::remove_dir_all(&cache_dir)?;
  Ok(())
}