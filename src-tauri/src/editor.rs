use std::path::PathBuf;

use crate::{app::{self, AppState}, errors};

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
    let path = editor_path.into();
    // path is to exe, so go up two folders
    let path = path
        .parent()?
        .parent()?
        .to_path_buf();
    Some(path)
}

pub fn load_modules(editor_path: impl Into<PathBuf>) -> anyhow::Result<Vec<UnityEditorModule>> {
    let path = editor_path.into();
    let editor_root = get_root_folder(path)
        .ok_or(errors::io_not_found("Invalid editor path"))?;
    let json_path = editor_root
        .join("modules")
        .with_extension("json");
    let json_content = std::fs::read_to_string(&json_path)?;
    let modules: Vec<UnityEditorModule> = serde_json::from_str(&json_content)?;
    Ok(modules)
}

pub fn find_editor_installs(app_state: &tauri::State<AppState>) -> anyhow::Result<Vec<UnityEditorInstall>, errors::AnyError> {
    let prefs = app::get_prefs(app_state)?;
    let hub_editors_path = prefs.hub_editors_path
        .ok_or(errors::str_error("hub_editors_path not set"))?;

    if !hub_editors_path.exists() {
        return Err(errors::io_not_found("Invalid hub_editors_path"));
    }

    let editor_folders = std::fs::read_dir(hub_editors_path)?;
    let mut editors = editor_folders
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();

            let version_name = &path.file_name()?
                .to_str()?
                .to_string();
            let exe_path = &path
                .join("Editor")
                .join("Unity")
                .with_extension("exe")
                .to_str()?
                .to_string();
            
            let modules = load_modules(exe_path)
                .ok()?;

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

pub fn open_editor(editor_version: String, arguments: Vec<String>, app_state: &tauri::State<AppState>) -> anyhow::Result<(), errors::AnyError> {
    let editor = app_state.editors.lock()
        .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?
        .iter()
        .find(|x| x.version == editor_version)
        .ok_or(errors::str_error("Invalid editor version"))?
        .clone();

    let exe_path = editor.exe_path;

    std::process::Command::new(&exe_path)
        .args(arguments)
        .spawn()?;

    Ok(())
}

// commands

#[tauri::command]
pub fn cmd_get_editors(app_state: tauri::State<AppState>) -> Result<Vec<UnityEditorInstall>, errors::AnyError> {
    let mut stored_editors = app_state.editors.lock()
        .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?;
    let editors = find_editor_installs(&app_state)?;
    *stored_editors = editors.clone();
    Ok(editors)
}

#[tauri::command]
pub fn cmd_open_unity_hub(app_state: tauri::State<AppState>) -> Result<(), errors::AnyError> {
    let prefs = app::get_prefs(&app_state)?;
    let unity_hub_path = prefs.hub_path
        .ok_or(errors::str_error("unity_hub_path not set"))?;

    if !unity_hub_path.exists() {
        return Err(errors::io_not_found("Invalid unity_hub_path"));
    }

    std::process::Command::new(&unity_hub_path)
        .spawn()?;

    Ok(())
}