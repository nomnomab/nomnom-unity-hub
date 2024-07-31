use std::{fs, path::PathBuf, sync::Mutex};
use anyhow::Result;

use serde::{Deserialize, Serialize};
use tauri::{api::{dialog, path::app_config_dir}, AppHandle, Manager};

pub fn setup(app: &AppHandle) -> Result<()> {
    let prefs = Prefs::create(app)?;
    app.manage(Mutex::new(prefs));
    Ok(())
}

#[tauri::command]
pub fn get_projects(app: tauri::AppHandle) -> Vec<Project> {
    let prefs = Prefs::create(&app).unwrap();
    prefs.projects
}

#[tauri::command]
pub fn add_project(app: tauri::AppHandle, path: String) -> Result<Project, String> {
    let mut prefs = Prefs::create(&app).unwrap();
    match Project::load(path) {
        Ok(project) => {
            prefs.projects.push(project.clone());
            prefs.save(&app).unwrap();
            return Ok(project);
        },
        Err(err) => {
            return Err(err.to_string());
        }
    }
}

#[tauri::command]
pub fn remove_project(app: tauri::AppHandle, path: String) {
    let mut prefs = Prefs::create(&app).unwrap();
    let index = prefs.projects.iter().position(|x| x.path == path);
    if let Some(index) = index {
        prefs.projects.remove(index);
        prefs.save(&app).unwrap();
    }
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
        Self { name: String::new(), path: String::new(), version: String::new() }
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
    // where new projects are created
    pub new_project_path: Option<PathBuf>,
    // typically C:\Program Files\Unity\Hub\Editor
    pub hub_editors_path: Option<PathBuf>,

    pub projects: Vec<Project>,
}

impl Default for Prefs {
    fn default() -> Self {
        Self { 
            new_project_path: Default::default(), 
            hub_editors_path: Some(PathBuf::from(r#"C:\Program Files\Unity\Hub\Editor"#)),
            projects: Vec::new()
        }
    }
}

impl Prefs {
    pub fn get_config_dir_path(config: &tauri::Config) -> PathBuf {
        app_config_dir(config).unwrap()
    }

    pub fn get_config_path(config: &tauri::Config) -> PathBuf {
        let path = Self::get_config_dir_path(config);
        path.join("prefs.json")
    }

    pub fn create(app: &AppHandle) -> Result<Self> {
        let config = app.config();
        let path = Self::get_config_path(&config);

        let dir = path.parent().unwrap();

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

        let dir = path.parent().unwrap();

        if !dir.exists() {
            fs::create_dir_all(dir)?;
        }
        
        let prefs_json = serde_json::to_string(&self)?;
        fs::write(path, prefs_json)?;

        Ok(())
    }
}