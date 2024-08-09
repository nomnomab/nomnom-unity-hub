use crate::{app::{self, AppState}, errors};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum UserCacheKey {
  LastEditorVersion
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserCache {
  pub last_editor_version: Option<String>
}

impl Default for UserCache {
  fn default() -> Self {
    Self {
      last_editor_version: None
    }
  }
}

// commands

#[tauri::command]
pub fn cmd_get_user_cache(app_state: tauri::State<AppState>) -> Result<UserCache, errors::AnyError> {
    let user_cache = app::get_user_cache(&app_state)?;
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