use std::{collections::HashMap, path::PathBuf};

use crate::{
  app::{self, AppState},
  errors, io_utils,
};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnityEditorInstall {
  pub exe_path: PathBuf,
  pub version: String,
  pub modules: Vec<UnityEditorModule>,
}

impl Default for UnityEditorInstall {
  fn default() -> Self {
    Self {
      exe_path: PathBuf::new(),
      version: String::new(),
      modules: Vec::new(),
    }
  }
}

// Program Files/Unity/Hub/Editor/<version>/modules.json
// definition for an installed module for an editor version
// such as visual studio, webgl, il2cpp, etc
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnityEditorModule {
  name: String,
  id: String,
  description: String,
  category: String,
  visible: bool,
  selected: bool,
}

impl Default for UnityEditorModule {
  fn default() -> Self {
    Self {
      name: String::new(),
      id: String::new(),
      description: String::new(),
      category: String::new(),
      visible: false,
      selected: false,
    }
  }
}

pub fn get_root_folder(editor_path: impl Into<PathBuf>) -> Option<std::path::PathBuf> {
  let path: PathBuf = editor_path.into();
  // path is to exe, so go up two folders
  let path = {
    if cfg!(target_os = "windows") {
      path.parent().and_then(|p| p.parent())
    } else if cfg!(target_family = "unix") {
      path.parent()
    } else {
      None
    }
  };
  if !path.is_some() {
    return None;
  }
  
  let path = path.unwrap().to_path_buf();
  Some(path)
}

pub fn get_working_root_folder(editor_path: impl Into<PathBuf>) -> Option<std::path::PathBuf> {
  let path: PathBuf = editor_path.into();
  // path is to exe, so go up two folders
  let path = {
    if cfg!(target_os = "windows") {
      path.parent().and_then(|p| p.parent())
    } else if cfg!(target_family = "unix") {
      Some(path.as_path())
    } else {
      None
    }
  };
  if !path.is_some() {
    return None;
  }
  
  let path = path.unwrap().to_path_buf();
  Some(path)
}

pub fn get_package_manager_folder(
  editor: &UnityEditorInstall,
) -> Result<PathBuf, errors::AnyError> {
  let root_path = crate::editor::get_working_root_folder(editor.exe_path.clone())
  .ok_or(errors::io_not_found("Invalid editor path"))?;
  
  let templates_path = root_path;
  let templates_path = {
    if cfg!(target_os = "windows") {
      Some(
        templates_path
          .join("Editor")
          .join("Data")
          .join("Resources")
          .join("PackageManager"),
      )
    } else if cfg!(target_family = "unix") {
      Some(
        templates_path
          .join("Contents")
          .join("Resources")
          .join("PackageManager"),
      )
    } else {
      None
    }
  }
  .ok_or(errors::io_not_found("Invalid editor path"))?;
  
  Ok(templates_path)
}

pub fn get_real_exe_path(editor: &UnityEditorInstall) -> Result<PathBuf, errors::AnyError> {
  if cfg!(target_os = "windows") {
    Ok(editor.exe_path.clone())
  } else if cfg!(target_os = "macos") {
    Ok(editor.exe_path.join("Contents").join("MacOS").join("Unity"))
  } else if cfg!(target_os = "linux") {
    Ok(editor.exe_path.join("Contents").join("Linux").join("Unity"))
  } else {
    Err(errors::io_not_found("Invalid editor path"))
  }
}

pub fn load_modules(editor_path: impl Into<PathBuf>) -> anyhow::Result<Vec<UnityEditorModule>> {
  let path = editor_path.into();
  let editor_root = get_root_folder(path).ok_or(errors::io_not_found("Invalid editor path"))?;
  
  let json_path = editor_root.join("modules").with_extension("json");
  let json_content = std::fs::read_to_string(&json_path)?;
  let modules: Vec<UnityEditorModule> = serde_json::from_str(&json_content)?;
  Ok(modules)
}

pub fn find_editor_installs(
  app_state: &tauri::State<AppState>,
) -> anyhow::Result<Vec<UnityEditorInstall>, errors::AnyError> {
  let prefs = app::get_prefs(app_state)?;
  let hub_editors_path = prefs
    .hub_editors_path
    .ok_or(errors::str_error("hub_editors_path not set"))?;
  
  if !hub_editors_path.exists() {
    return Err(errors::io_not_found("Invalid hub_editors_path"));
  }
  
  let editor_folders = std::fs::read_dir(hub_editors_path)?;
  let mut editors = editor_folders
    .filter_map(|entry| {
      let entry = entry.ok()?;
      let path = entry.path();
      
      if path
        .file_name()
        .is_some_and(|x| x.to_str().is_some_and(|y| y.starts_with(".")))
      {
        return None;
      }
      
      let version_name = &path.file_name()?.to_str()?.to_string();
      
      let exe_path = {
        if cfg!(target_os = "windows") {
          Some(path.join("Editor").join("Unity").with_extension("exe"))
        } else if cfg!(target_family = "unix") {
          Some(path.join("Unity").with_extension("app"))
        } else {
          None
        }
      }?
    .to_str()?
    .to_string();
    
    let modules = load_modules(&exe_path).ok()?;
    
    let editor = UnityEditorInstall {
      exe_path: PathBuf::from(exe_path),
      version: version_name.clone(),
      modules,
    };
    
    if path.is_dir() {
      Some(editor)
    } else {
      None
    }
  })
  .collect::<Vec<_>>();
  
  // sort by semver
  editors.sort_by(|a, b| {
    let split_a = a
      .version
    .split(|c| c == '.' || c == 'f')
    .collect::<Vec<_>>();
    let split_b = b
      .version
      .split(|c| c == '.' || c == 'f')
      .collect::<Vec<_>>();
    
    let nums_a = split_a
      .iter()
      .map(|s| s.parse::<u32>().unwrap_or(0))
      .collect::<Vec<_>>();
    let nums_b = split_b
      .iter()
      .map(|s| s.parse::<u32>().unwrap_or(0))
      .collect::<Vec<_>>();
    
    (nums_a[0].cmp(&nums_b[0]))
      .then_with(|| nums_a[1].cmp(&nums_b[1]))
      .then_with(|| nums_a[2].cmp(&nums_b[2]))
      .then_with(|| nums_a[3].cmp(&nums_b[3]))
  });
  editors.reverse();
  
  Ok(editors)
}

pub fn open(
  editor_version: String,
  arguments: Vec<String>,
  app_state: &tauri::State<AppState>,
  wait: bool,
) -> anyhow::Result<(), errors::AnyError> {
  let editor = app_state
    .editors
    .lock()
    .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?
    .iter()
    .find(|x| x.version == editor_version)
    .ok_or(errors::str_error("Invalid editor version"))?
    .clone();
  
  let exe_path = get_real_exe_path(&editor)?;
  
  if wait {
    std::process::Command::new(&exe_path)
      .args(arguments)
      .output()?;
  } else {
    std::process::Command::new(&exe_path)
      .args(arguments)
      .spawn()?;
  }
  
  Ok(())
}

pub fn estimate_size(
  editor: &UnityEditorInstall,
  app: &tauri::AppHandle,
) -> anyhow::Result<u64, errors::AnyError> {
  let tmp_json_path = io_utils::get_cache_dir(&app)?
    .join("editors")
    .with_extension("json");
  
  if !tmp_json_path.exists() {
    // write a new json to disk
    let map: HashMap<String, serde_json::Value> = HashMap::new();
    let json_str = serde_json::to_string_pretty(&map)?;
    std::fs::write(&tmp_json_path, json_str)?;
  }
  
  let map = std::fs::read_to_string(&tmp_json_path)?;
  let mut map = serde_json::from_str::<HashMap<String, serde_json::Value>>(&map)?;
  
  let exe_path = editor
  .exe_path
    .clone()
    .to_str()
    .ok_or(errors::str_error("Invalid editor path"))?
    .to_string();
  
  if map.contains_key(&exe_path) {
    let disk_size = { map.get(&exe_path).and_then(|x| x.as_u64()) };
    
    if let Some(disk_size) = disk_size {
      return Ok(disk_size);
    }
  }
  
  let root_path = crate::editor::get_root_folder(&editor.exe_path)
    .ok_or(errors::str_error("Invalid editor root path"))?;
  let disk_size = io_utils::dir_size(root_path).unwrap_or(0u64);
  map.insert(exe_path, serde_json::Value::from(disk_size));
  std::fs::write(&tmp_json_path, serde_json::to_string_pretty(&map)?)?;
  
  Ok(disk_size)
}

// commands

#[tauri::command]
pub fn cmd_get_editors(
  app_state: tauri::State<AppState>,
) -> Result<Vec<UnityEditorInstall>, errors::AnyError> {
  let mut stored_editors = app_state
    .editors
    .lock()
    .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?;
  let editors = find_editor_installs(&app_state)?;
  *stored_editors = editors.clone();
  Ok(editors)
}

#[tauri::command]
pub fn cmd_open_unity_hub(app_state: tauri::State<AppState>) -> Result<(), errors::AnyError> {
  let prefs = app::get_prefs(&app_state)?;
  let unity_hub_path = prefs
  .hub_path
    .ok_or(errors::str_error("unity_hub_path not set"))?;
  
  if !unity_hub_path.exists() {
    return Err(errors::io_not_found("Invalid unity_hub_path"));
  }
  
  std::process::Command::new(&unity_hub_path).spawn()?;
  
  Ok(())
}

#[tauri::command]
pub fn cmd_estimate_editor_size(
  editor_version: String,
  app_handle: tauri::AppHandle,
  app_state: tauri::State<AppState>,
) -> Result<u64, errors::AnyError> {
  let editors = app_state
  .editors
    .lock()
    .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?;
  let editor = editors
    .iter()
    .find(|x| x.version == editor_version)
    .ok_or(errors::str_error("Invalid editor version"))?;
  
  estimate_size(editor, &app_handle)
}
