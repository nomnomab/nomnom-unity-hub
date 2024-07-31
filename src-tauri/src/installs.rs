use std::process::Command;

use serde::{Deserialize, Serialize};

use crate::prefs::{Prefs};

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
pub struct InstallModule {
    name: String,
    id: String,
    description: String,
    category: String,
    visible: bool,
    selected: bool,
}

impl Default for InstallModule {
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
pub struct EditorInstall {
    version: String,
    path: String,
    modules: Vec<InstallModule>
}

impl Default for EditorInstall {
    fn default() -> Self {
        Self {
            version: String::new(),
            path: String::new(),
            modules: Vec::new()
        }
    }
}

impl EditorInstall {
    pub fn get_folder(path: &str) -> std::path::PathBuf {
        std::path::PathBuf::from(path).parent().unwrap().parent().unwrap().to_path_buf()
    }

    pub fn load_modules(folder: std::path::PathBuf) -> Vec<InstallModule> {
        let json_path = folder.join("modules.json");
        let modules_json = std::fs::read_to_string(json_path).unwrap();
        let modules: Vec<InstallModule> = serde_json::from_str(&modules_json).unwrap();
        modules
    }
}

#[tauri::command]
pub fn get_editor_installs(app: tauri::AppHandle) -> Result<Vec<EditorInstall>, String> {
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
                    let modules = EditorInstall::load_modules(folder);

                    EditorInstall {
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