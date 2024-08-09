use std::{fs, path::{Path, PathBuf}};

use crate::{app::{self, AppState}, errors, prefs};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Project {
    pub name: String,
    pub path: PathBuf,
    pub version: String,
}

impl Default for Project {
    fn default() -> Self {
        Self {
            name: String::new(),
            path: PathBuf::new(),
            version: String::new(),
        }
    }
}

// load a project at a given path
pub fn load(path: impl AsRef<Path>) -> anyhow::Result<Project> {
    let path = path.as_ref();
    let file_name = path
        .file_name()
        .ok_or(errors::io_not_found("Invalid project path"))?;

    let version_path = path
        .join("ProjectSettings")
        .join("ProjectVersion")
        .with_extension("txt");

    let version_contents = fs::read_to_string(version_path)?;
    let version = version_contents
        .lines()
        .next()
        .ok_or(errors::io_not_found("Invalid project version"))?
        .strip_prefix("m_EditorVersion:")
        .ok_or(errors::io_not_found("Invalid project version"))?
        .trim()
        .to_string();

    let project = Project {
        name: file_name
            .to_str()
            .unwrap_or("BAD_PROJECT_NAME")
            .to_string(),
        path: PathBuf::from(path),
        version,
    };

    Ok(project)
}

pub fn has_valid_path(project: &Project) -> anyhow::Result<(), errors::AnyError> {
    let path = project.path.clone();
    if !(path.exists() && !path.is_dir()) {
        return Err(errors::io_not_found("Invalid project path"));
    }

    Ok(())
}

pub fn remove_missing_projects(app_state: &tauri::State<AppState>) -> anyhow::Result<Vec<Project>> {
    let mut projects = app_state.projects.lock()
        .map_err(|_| errors::str_error("Failed to lock projects"))?;
    let missing_projects = projects
        .iter()
        .filter(|x| !x.path.clone().exists())
        .map(|x| x.clone())
        .collect::<Vec<_>>();
    
    projects
        .retain(|x| x.path.clone().exists());

    Ok(missing_projects)
}

pub fn get_projects_on_page(app_state: &tauri::State<AppState>, page: usize, per_page_count: usize, search: Option<String>) -> anyhow::Result<Vec<Project>> {
    let projects = app_state.projects.lock()
        .map_err(|_| errors::str_error("Failed to lock projects"))?;
    let start = page * per_page_count;
    let mut projects = projects
        .iter()
        .filter(|x| search.is_none() || x.name.to_lowercase().contains(&search.clone().unwrap().to_lowercase()))
        .skip(start)
        .take(per_page_count)
        .map(|x| x.clone())
        .collect::<Vec<_>>();
    // projects.sort_by(|x, y| x.name.cmp(&y.name));
    Ok(projects)
}

// commands

#[tauri::command]
pub fn cmd_get_default_project_path(app_state: tauri::State<AppState>) -> Result<String, errors::AnyError> {
    let prefs = app::get_prefs(&app_state)?;
    let new_project_path = prefs.new_project_path
        .ok_or(errors::str_error("new_project_path not set"))?
        .to_str()
        .ok_or(errors::str_error("Invalid new_project_path"))?
        .to_string();
    Ok(new_project_path)
}

#[tauri::command]
pub fn cmd_remove_missing_projects(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>) -> Result<Vec<Project>, errors::AnyError> {
    let removed_projects = remove_missing_projects(&app_state)?;
    let projects = app::get_projects(&app_state)?;
    app::save_projects_to_disk(&projects, &app_handle)?;
    Ok(removed_projects)
}

#[tauri::command]
pub fn cmd_add_project(project_path: PathBuf, app_handle: tauri::AppHandle, app_state: tauri::State<AppState>) -> Result<Project, errors::AnyError> {
    if !Path::new(&project_path).exists() {
        return Err(errors::io_not_found("Invalid project path"));
    }
    
    let projects = app::get_projects(&app_state)?;
    if projects.iter().any(|x| x.path == project_path) {
        return Err(errors::str_error("Project already exists"));
    }
    
    let project = load(project_path)?;
    let projects = {
        let mut projects = app_state.projects.lock()
            .map_err(|_| errors::str_error("Failed to get projects. Is it locked?"))?;
        projects.insert(0, project.clone());
        projects
    };

    app::save_projects_to_disk(&projects, &app_handle)?;
    
    Ok(project)
}

#[tauri::command]
pub fn cmd_remove_project(project_path: PathBuf, app_handle: tauri::AppHandle, app_state: tauri::State<AppState>) -> Result<(), errors::AnyError> {
    if !Path::new(&project_path).exists() {
        return Err(errors::io_not_found("Invalid project path"));
    }

    let projects = {
        let mut projects = app_state.projects.lock()
            .map_err(|_| errors::str_error("Failed to get projects. Is it locked?"))?;
        projects.retain(|x| x.path != project_path);
        projects
    };

    app::save_projects_to_disk(&projects, &app_handle)?;
    
    Ok(())
}

#[tauri::command]
pub fn cmd_get_projects(app_state: tauri::State<AppState>) -> Result<Vec<Project>, errors::AnyError> {
    let projects = app::get_projects(&app_state)?;
    Ok(projects)
}

#[tauri::command]
pub fn cmd_get_projects_on_page(app_state: tauri::State<AppState>, page: usize, per_page_count: usize, search: Option<String>) -> Result<Vec<Project>, errors::AnyError> {
    let projects = get_projects_on_page(&app_state, page, per_page_count, search)?;
    Ok(projects)
}

#[tauri::command]
pub fn cmd_open_project_in_editor(app_state: tauri::State<AppState>, project_path: PathBuf, editor_version: String) -> Result<(), errors::AnyError> {
    if !project_path.exists() {
        return Err(errors::io_not_found("Invalid project path"));
    }

    let project_path_str = project_path.to_str()
        .ok_or(errors::str_error("Invalid project path"))?
        .to_string();

    let args = vec!["-projectPath".to_string(), project_path_str];
    crate::editor::open(editor_version, args, &app_state)?;

    Ok(())
}

#[tauri::command]
pub fn cmd_change_project_editor_version(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>, project_path: PathBuf, editor_version: String) -> Result<(), errors::AnyError> {
    let mut projects = app_state.projects.lock()
        .map_err(|_| errors::str_error("Failed to get projects. Is it locked?"))?;

    let project = projects
        .iter_mut()
        .find(|x| x.path == project_path)
        .ok_or(errors::str_error("Project not found"))?;

    project.version = editor_version;
    app::save_projects_to_disk(&projects, &app_handle)?;
        
    Ok(())
}