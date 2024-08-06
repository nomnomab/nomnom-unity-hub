use anyhow::Result;
use std::{fs, path::PathBuf, sync::Mutex};

use serde::{Deserialize, Serialize};
use tauri::{api::path::app_config_dir, AppHandle, Manager};

pub fn setup(app: &AppHandle) -> Result<()> {
    let prefs = Prefs::create(app)?;
    app.manage(Mutex::new(prefs));
    Ok(())
}

#[derive(thiserror::Error, Debug)]
enum PrefError {
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error("Could not create project")]
    CreateProjectFailed,
}

impl serde::Serialize for PrefError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[tauri::command]
pub fn get_projects(app: tauri::AppHandle) -> Result<Vec<Project>, PrefError> {
    clean_projects(app.clone());

    match Prefs::create(&app) {
        Ok(prefs) => Ok(prefs.projects),
        Err(err) => Err(err),
    }
}

#[tauri::command]
pub fn add_project(app: tauri::AppHandle, path: String) -> Result<Project, String> {
    let mut prefs = Prefs::create(&app).map_err(|err| err.to_string())?;
    let project = Project::load(path).map_err(|err| err.to_string())?;

    // if project already exists, don't add it
    if prefs.projects.iter().any(|x| x.path == project.path) {
        return Err("Project already exists".to_string());
    }

    prefs.projects.insert(0, project.clone());
    prefs.save(&app).map_err(|err| err.to_string())?;

    return Ok(project);
}

#[tauri::command]
pub fn clean_projects(app: tauri::AppHandle) -> Result<(), String> {
    let mut prefs = Prefs::create(&app).map_err(|err| err.to_string())?;

    // remove any projects that don't exist
    prefs
        .projects
        .retain(|x| std::path::Path::new(&x.path).exists());

    prefs.save(&app).map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn remove_project(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let mut prefs = Prefs::create(&app).map_err(|err| err.to_string())?;
    let Some(index) = prefs.projects.iter().position(|x| x.path == path) else {
        return Err("Project not found".to_string());
    };

    prefs.projects.remove(index);
    prefs.save(&app).map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_prefs(app: tauri::AppHandle) -> Result<Prefs, String> {
    let project = Prefs::create(&app).map_err(|err| err.to_string())?;
    Ok(project)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default, rename_all = "camelCase")]
pub struct DummyPrefs {
    // where new projects are created
    pub new_project_path: Option<PathBuf>,
    // typically C:\Program Files\Unity Hub\Unity Hub.exe
    pub hub_path: Option<PathBuf>,
    // typically C:\Program Files\Unity\Hub\Editor
    pub hub_editors_path: Option<PathBuf>,
    // typically C:\Users\nomno\AppData\Roaming\UnityHub\
    pub hub_appdata_path: Option<PathBuf>,
}

impl Default for DummyPrefs {
    fn default() -> Self {
        Self {
            new_project_path: None,
            hub_path: None,
            hub_editors_path: None,
            hub_appdata_path: None,
        }
    }
}

#[tauri::command]
pub fn save_prefs(app: tauri::AppHandle, dummy_prefs: DummyPrefs) {
    let mut prefs = Prefs::create(&app).unwrap();
    let mut changed = false;

    if let Some(path) = dummy_prefs.new_project_path {
        prefs.new_project_path = Some(path);
        changed = true;
    }

    if let Some(path) = dummy_prefs.hub_path {
        prefs.hub_path = Some(path);
        changed = true;
    }

    if let Some(path) = dummy_prefs.hub_editors_path {
        prefs.hub_editors_path = Some(path);
        changed = true;
    }

    if let Some(path) = dummy_prefs.hub_appdata_path {
        prefs.hub_appdata_path = Some(path);
        changed = true;
    }

    if changed {
        prefs.save(&app).unwrap();
    }
}

#[tauri::command]
pub fn get_default_project_path(app: tauri::AppHandle) -> String {
    let prefs = Prefs::create(&app).unwrap();

    if let Some(path) = prefs.new_project_path {
        return path.to_str().unwrap().to_string();
    }

    dirs_next::document_dir()
        .unwrap()
        .join("Unity Projects")
        .to_str()
        .unwrap()
        .to_string()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default, rename_all = "camelCase")]
pub struct Project {
    pub name: String,
    pub path: String,
    pub version: String,
}

impl Default for Project {
    fn default() -> Self {
        Self {
            name: String::new(),
            path: String::new(),
            version: String::new(),
        }
    }
}

impl Project {
    pub fn load(path: String) -> Result<Self> {
        let path_buf = PathBuf::from(&path);
        let name = path_buf.file_name().unwrap().to_str().unwrap().to_string();

        // editor version is stored at [project path]/ProjectSettings/ProjectVersion.txt
        // and is stored in yaml next to m_EditorVersion
        let project_version_path = path_buf.join("ProjectSettings/ProjectVersion.txt");
        let contents = fs::read_to_string(project_version_path)?;
        let version = contents.lines().nth(0).unwrap().trim().to_string();
        let version = version["m_EditorVersion: ".len()..].to_string();

        Ok(Self {
            name,
            path,
            version,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default, rename_all = "camelCase")]
pub struct Prefs {
    pub past_first_boot: bool,
    // where new projects are created
    pub new_project_path: Option<PathBuf>,
    // typically C:\Program Files\Unity Hub\Unity Hub.exe
    pub hub_path: Option<PathBuf>,
    // typically C:\Program Files\Unity\Hub\Editor
    pub hub_editors_path: Option<PathBuf>,
    // typically C:\Users\nomno\AppData\Roaming\UnityHub\
    pub hub_appdata_path: Option<PathBuf>,

    pub projects: Vec<Project>,
    pub last_used_editor_version: Option<String>,
}

impl Default for Prefs {
    fn default() -> Self {
        Self {
            past_first_boot: false,
            new_project_path: Some(dirs_next::document_dir().unwrap()),
            hub_path: Some(PathBuf::from(r#"C:\Program Files\Unity Hub\Unity Hub.exe"#)),
            hub_editors_path: Some(PathBuf::from(r#"C:\Program Files\Unity\Hub\Editor"#)),
            // hub_appdata_path: Some(PathBuf::from(r#"C:\Users\nomno\AppData\Roaming\UnityHub"#)),
            hub_appdata_path: Some(dirs_next::config_dir().unwrap().join("UnityHub")),
            projects: Vec::new(),
            last_used_editor_version: Default::default(),
        }
    }
}

impl Prefs {
    pub fn get_config_dir_path(config: &tauri::Config) -> anyhow::Result<PathBuf> {
        app_config_dir(config)?
    }

    pub fn get_config_path(config: &tauri::Config) -> PathBuf {
        let path = Self::get_config_dir_path(config);
        path.join("prefs.json")
    }

    pub fn create(app: &AppHandle) -> anyhow::Result<Self> {
        let config = app.config();
        let path = Self::get_config_path(&config);

        let Some(dir) = path.parent() else {
            return Err(anyhow::anyhow!("prefs path has no parent dir"));
        };

        if !dir.exists() {
            fs::create_dir_all(dir)?;
        }

        let file_exists = path.exists();
        let prefs = match file_exists {
            true => serde_json::from_str(&fs::read_to_string(path)?)?,
            false => {
                let prefs = Prefs::default();
                let prefs_json = serde_json::to_string(&prefs)?;
                fs::write(path, prefs_json)?;
                prefs
            }
        };

        Ok(prefs)
    }

    pub fn save(&self, app: &AppHandle) -> Result<()> {
        let config = app.config();
        let path = Self::get_config_path(&config);

        let Some(dir) = path.parent() else {
            return Err(anyhow::anyhow!("prefs path has no parent dir"));
        };

        if !dir.exists() {
            fs::create_dir_all(dir)?;
        }

        let prefs_json = serde_json::to_string(&self)?;
        fs::write(path, prefs_json)?;

        Ok(())
    }
}

#[tauri::command]
pub fn is_first_boot(app: tauri::AppHandle) -> bool {
    let prefs = Prefs::create(&app).unwrap();
    !prefs.past_first_boot
}

#[tauri::command]
pub fn set_past_first_boot(app: tauri::AppHandle) {
    let mut prefs = Prefs::create(&app).unwrap();
    prefs.past_first_boot = true;
    prefs.save(&app).unwrap();
}
