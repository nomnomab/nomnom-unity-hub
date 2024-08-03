use std::{collections::HashMap, process::Command};
use serde::{Deserialize, Serialize};
use crate::{io_util::get_cache_dir, prefs::Prefs};
use filesize::PathExt;

#[tauri::command]
pub fn open_project(app: tauri::AppHandle, project_path: String, editor_version: String) {
    let project_path = project_path.replace("\\", "/");
    open_editor(app, editor_version, vec!["-projectPath".to_string(), project_path]);
}

#[tauri::command]
pub fn open_editor(app: tauri::AppHandle, editor_version: String, arguments: Vec<String>) {
    let editors = get_editor_installs(app).unwrap();
    let editor = editors.iter().find(|x| x.version == editor_version).unwrap();
    let exe_path = &editor.path;

    Command::new(&exe_path)
        .args(arguments)
        .spawn()
        .unwrap();
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct EditorModule {
    name: String,
    id: String,
    description: String,
    category: String,
    visible: bool,
    selected: bool,
}

impl Default for EditorModule {
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

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct Editor {
    pub version: String,
    pub path: String,
    pub modules: Vec<EditorModule>
}

impl Default for Editor {
    fn default() -> Self {
        Self {
            version: String::new(),
            path: String::new(),
            modules: Vec::new()
        }
    }
}

impl Editor {
    pub fn get_folder(path: &str) -> std::path::PathBuf {
        std::path::PathBuf::from(path).parent().unwrap().parent().unwrap().to_path_buf()
    }

    pub fn load_modules(folder: std::path::PathBuf) -> Vec<EditorModule> {
        let json_path = folder.join("modules.json");
        let modules_json = std::fs::read_to_string(json_path).unwrap();
        let modules: Vec<EditorModule> = serde_json::from_str(&modules_json).unwrap();
        modules
    }
}

#[tauri::command]
pub fn get_editor_installs(app: tauri::AppHandle) -> Result<Vec<Editor>, String> {
    match Prefs::create(&app) {
        Ok(prefs) => {
            let install_dir = prefs.hub_editors_path.unwrap();
            let folders = std::fs::read_dir(install_dir);
            if let Err(msg) = folders {
                return Err(msg.to_string());
            }

            let mut folders = folders.unwrap()
                .map(|entry| {
                    let entry = entry.unwrap();
                    let version = entry.file_name().to_str().unwrap().to_string();
                    let path = entry.path().join("Editor").join("Unity.exe").to_str().unwrap().to_string();
                    let folder = entry.path();
                    let modules = Editor::load_modules(folder.clone());

                    Editor {
                        version,
                        path,
                        modules
                    }
                })
                .collect::<Vec<_>>();

            folders.sort_by(|a, b| {
                let split_a = a.version.split(|c| c == '.' || c == 'f').collect::<Vec<_>>();
                let split_b = b.version.split(|c| c == '.' || c == 'f').collect::<Vec<_>>();

                let nums_a = split_a.iter().map(|s| s.parse::<u32>().unwrap()).collect::<Vec<_>>();
                let nums_b = split_b.iter().map(|s| s.parse::<u32>().unwrap()).collect::<Vec<_>>();

                (nums_a[0].cmp(&nums_b[0]))
                    .then_with(|| nums_a[1].cmp(&nums_b[1]))
                    .then_with(|| nums_a[2].cmp(&nums_b[2]))
                    .then_with(|| nums_a[3].cmp(&nums_b[3]))
            });
            folders.reverse();

            Ok(folders)
        },
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub async fn calculate_disk_size(path: String) -> f64 {
    let dir = std::path::Path::new(&path);
    let disk_size = dir.size_on_disk().unwrap_or(0u64);
    let disk_size = disk_size as f64 / 1024.0 / 1024.0;
    disk_size
}

#[tauri::command]
pub async fn calculate_editor_disk_size(app: tauri::AppHandle, editor_path: String) -> u64 {
    let tmp_json_path = get_cache_dir(&app).join("editors.json");
    if !tmp_json_path.exists() {
        let map: HashMap<String, serde_json::Value> = HashMap::new();
        std::fs::write(&tmp_json_path, serde_json::to_string_pretty(&map).unwrap()).unwrap();
    }

    let map = std::fs::read_to_string(&tmp_json_path).unwrap();
    let mut map: HashMap<String, serde_json::Value> = serde_json::from_str(&map).unwrap();
    if map.contains_key(&editor_path) {
        let disk_size = map.get(&editor_path).unwrap().as_u64().unwrap();
        return disk_size;
    }
    
    let path = Editor::get_folder(&editor_path);
    // let dir = std::path::Path::new(&path);
    // let disk_size = dir.size_on_disk().unwrap();
    let disk_size = dir_size(&path).unwrap_or(0u64);
    // let disk_size = disk_size as f64 / 1024.0 / 1024.0;

    map.insert(editor_path, serde_json::Value::from(disk_size));
    std::fs::write(tmp_json_path, serde_json::to_string_pretty(&map).unwrap()).unwrap();
    
    disk_size
}

fn dir_size(path: impl Into<std::path::PathBuf>) -> std::io::Result<u64> {
    fn dir_size(mut dir: std::fs::ReadDir) -> std::io::Result<u64> {
        dir.try_fold(0, |acc, file| {
            let file = file?;
            let size = match file.metadata()? {
                data if data.is_dir() => dir_size(std::fs::read_dir(file.path())?)?,
                data => data.len(),
            };
            Ok(acc + size)
        })
    }

    dir_size(std::fs::read_dir(path.into())?)
}

#[tauri::command]
pub fn get_last_used_editor(app: tauri::AppHandle) -> String {
    let prefs = Prefs::create(&app).unwrap();
    if let Some(editor) = prefs.last_used_editor_version {
        return editor;
    }

    let editors = get_editor_installs(app).unwrap();
    if editors.len() > 0 {
        return editors[0].version.clone();
    }

    String::new()
}

#[tauri::command]
pub fn set_last_used_editor(app: tauri::AppHandle, editor_version: String) {
    let mut prefs = Prefs::create(&app).unwrap();
    prefs.last_used_editor_version = Some(editor_version);
    prefs.save(&app).unwrap();
}

pub fn get_hub_templates_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    let prefs = Prefs::create(&app).unwrap();
    prefs.hub_appdata_path.unwrap().join("Templates")
}