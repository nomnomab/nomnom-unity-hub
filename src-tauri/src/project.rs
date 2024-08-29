use std::{fs, path::{Path, PathBuf}};

use crate::{app::{self, AppState}, errors, io_utils, package, template::TgzPackageJson};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Project {
  pub name: String,
  pub path: PathBuf,
  pub version: String,
  pub is_pinned: bool,
  pub added_at: u128,
  pub last_opened_at: u128,
}

impl Default for Project {
  fn default() -> Self {
    Self {
      name: String::new(),
      path: PathBuf::new(),
      version: String::new(),
      is_pinned: false,
      added_at: 0u128,
      last_opened_at: 0u128,
    }
  }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum SortType {
  DateAdded,
  Name,
  DateOpened,
  EditorVersion,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
  name_filter: Option<String>,
  // sort_by: Option<SortType>,
}

// load a project at a given path
pub fn load(path: impl AsRef<Path>) -> Result<Project, errors::AnyError> {
  let path = path.as_ref();
  let assets_path = path.join("Assets");

  if !assets_path.exists() {
    return Err(errors::io_not_found("Invalid project path"));
  }
  
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
    ..Default::default()
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
    .filter(|x| !x.path.clone().exists() || !x.path.clone().join("Assets").exists())
    .map(|x| x.clone())
    .collect::<Vec<_>>();
  
  projects
    .retain(|x| x.path.clone().exists());
  
  Ok(missing_projects)
}

fn filter_by_name(name_filter: &str, projects: &mut Vec<Project>) {
  if name_filter.is_empty() {
    return;
  }

  let lowercase_filter = name_filter.to_lowercase();
  
  projects
    .retain(|x| x.name.to_lowercase().contains(&lowercase_filter));
}

fn filter_by_sort(sort_by: SortType, projects: &mut Vec<Project>) {
  match sort_by {
    SortType::DateOpened => projects.sort_by(|x, y| y.last_opened_at.cmp(&x.last_opened_at)),
    SortType::Name => projects.sort_by(|x, y| x.name.cmp(&y.name)),
    SortType::DateAdded => projects.sort_by(|x, y| y.added_at.cmp(&x.added_at)),
    SortType::EditorVersion => projects.sort_by(|x, y| y.version.cmp(&x.version)),
    _ => {}
  }
}

fn sort_by_pinned(projects: &mut Vec<Project>) {
  // pinned go first
  projects.sort_by(|x, y| y.is_pinned.cmp(&x.is_pinned));
}

pub fn get_projects_on_page(app_state: &tauri::State<AppState>, page: usize, per_page_count: usize, search: SearchOptions) -> anyhow::Result<Vec<Project>> {
  let mut projects = app::get_projects(&app_state)?;
  sort_by_pinned(&mut projects);

  let start = page * per_page_count;

  if let Some(name_filter) = search.name_filter {
    filter_by_name(&name_filter, &mut projects);
  }

  if let Some(sort_by) = app::get_prefs(&app_state)?.project_sort_type {
    filter_by_sort(sort_by, &mut projects);
  }

  sort_by_pinned(&mut projects);
  
  let mut projects = projects
    .iter()
    // .filter(|x| search.name_filter.is_none() || x.name.to_lowercase().contains(&y.clone().unwrap().to_lowercase()))
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
pub async fn cmd_remove_missing_projects(app_handle: tauri::AppHandle, app_state: tauri::State<'_, AppState>) -> Result<Vec<Project>, errors::AnyError> {
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
  
  let mut projects = app_state.projects.lock()
    .map_err(|_| errors::str_error("Failed to get projects. Is it locked?"))?;
  if projects.iter().any(|x| x.path == project_path) {
    return Err(errors::str_error("Project already exists"));
  }
  
  let mut project = load(project_path)?;
  project.added_at = std::time::UNIX_EPOCH
    .elapsed()
    .unwrap_or(std::time::Duration::from_secs(0))
    .as_millis();
  projects.insert(0, project.clone());
  
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
pub async fn cmd_get_projects(app_state: tauri::State<'_, AppState>) -> Result<Vec<Project>, errors::AnyError> {
  let mut projects = app::get_projects(&app_state)?;
  sort_by_pinned(&mut projects);
  Ok(projects)
}

#[tauri::command]
pub async fn cmd_get_projects_on_page(app_state: tauri::State<'_, AppState>, page: usize, per_page_count: usize, search_options: SearchOptions) -> Result<Vec<Project>, errors::AnyError> {
  let projects = get_projects_on_page(&app_state, page, per_page_count, search_options)?;
  Ok(projects)
}

#[tauri::command]
pub fn cmd_open_project_in_editor(app_handle: tauri::AppHandle, app_state: tauri::State<AppState>, project_path: PathBuf, editor_version: String) -> Result<(), errors::AnyError> {
  if !project_path.exists() {
    return Err(errors::io_not_found("Invalid project path"));
  }
  
  let project_path_str = project_path.to_str()
    .ok_or(errors::str_error("Invalid project path"))?
    .to_string();
  
  let args = vec!["-projectPath".to_string(), project_path_str];
  crate::editor::open(editor_version, args, &app_state, false)?;

  let time = std::time::UNIX_EPOCH
    .elapsed()
    .unwrap_or(std::time::Duration::from_secs(0));
  let millis = time.as_millis();

  let mut projects = app_state.projects.lock()
    .map_err(|_| errors::str_error("Failed to get projects. Is it locked?"))?;
  let project = projects
    .iter_mut()
    .find(|x| x.path == project_path)
    .ok_or(errors::str_error("Project not found"))?;
  project.last_opened_at = millis;

  app::save_projects_to_disk(&projects, &app_handle)?;
  
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

#[tauri::command]
pub fn cmd_fetch_project_thumbnail(project_path: PathBuf) -> Result<String, errors::AnyError> {
  let thumbnail_path = project_path.join("thumbnail").with_extension("png");
  if !thumbnail_path.exists() {
    return Err(errors::io_not_found("Thumbnail not found"));
  }
  
  Ok(thumbnail_path.to_str().unwrap().to_string())
}

#[tauri::command]
pub fn cmd_pin_project(project_path: PathBuf, app_handle: tauri::AppHandle, app_state: tauri::State<AppState>) -> Result<(), errors::AnyError> {
  let mut projects = app_state.projects.lock()
    .map_err(|_| errors::str_error("Failed to get projects. Is it locked?"))?;
  
  let project = projects
    .iter_mut()
    .find(|x| x.path == project_path)
    .ok_or(errors::str_error("Project not found"))?;
  
  project.is_pinned = true;
  println!("{} pinned", project.path.display());
  app::save_projects_to_disk(&projects, &app_handle)?;
  
  Ok(())
}

#[tauri::command]
pub fn cmd_unpin_project(project_path: PathBuf, app_handle: tauri::AppHandle, app_state: tauri::State<AppState>) -> Result<(), errors::AnyError> {
  let mut projects = app_state.projects.lock()
    .map_err(|_| errors::str_error("Failed to get projects. Is it locked?"))?;
  
  let project = projects
    .iter_mut()
    .find(|x| x.path == project_path)
    .ok_or(errors::str_error("Project not found"))?;
  
  project.is_pinned = false;
  println!("{} unpinned", project.path.display());
  app::save_projects_to_disk(&projects, &app_handle)?;
  
  Ok(())
}

#[tauri::command]
pub fn cmd_is_open_in_editor(project_path: PathBuf, editor_version: String, app_state: tauri::State<AppState>) -> Result<bool, errors::AnyError> {
  use window_titles::{Connection, ConnectionTrait};
  let connection = Connection::new()
    .map_err(|_| errors::str_error("Failed to get connection"))?;
  let titles = connection.window_titles()
    .map_err(|_| errors::str_error("Failed to get window titles"))?;

  println!("{:?}", titles);

  let project_name = project_path
    .file_name()
    .ok_or(errors::str_error("Invalid project path"))?
    .to_str()
    .ok_or(errors::str_error("Invalid project path"))?
    .to_string();

  // needs to start with project_name and contain Unity editor_version near the end
  // todo: make sure this works fine on other platforms
  let contains_title = titles
    .iter()
    .any(|x| x.starts_with(&project_name) && x.contains(format!("Unity {}", editor_version).as_str()));
  Ok(contains_title)
}

#[tauri::command]
pub fn cmd_load_project_files_tree(project_path: PathBuf) -> Result<io_utils::FileDir, errors::AnyError> {
  let project_path_path = project_path.as_path();
  let walk = walkdir::WalkDir::new(project_path_path);
  // let all_files = walk
  //   .into_iter()
  //   .filter_map(|x| x.and(|y| y.path()))
  //   .collect::<Vec<_>>();

  let mut root = io_utils::dir("package");

  // io_utils::build_tree(&mut root, &vec!["package.json".to_string()], 0);
  
  // let project_dir = std::path::PathBuf::from("ProjectData~");
  
  fn is_hidden(entry: &walkdir::DirEntry) -> bool {
    entry
      .file_name()
      .to_str()
      .map(|s| s.starts_with('.'))
      .unwrap_or(false)
  }
  
  fn is_banned(entry: &walkdir::DirEntry) -> bool {
    let banned_names = ["Library", "obj", "Logs", "Temp", "UserSettings"];
    banned_names
      .iter()
      .any(|s| entry.file_name().to_str().unwrap().starts_with(s))
  }
  
  for file in walk.into_iter().filter_entry(|e| !is_hidden(e) && !is_banned(e)).filter_map(|x| x.ok()) {
    let file_path = file.path();
    let file_path = file_path.strip_prefix(project_path_path);

    if let Ok(file_path) = file_path {
      let depth = file.depth();
      if depth <= 1 {
        continue;
      }

      // let file_path = project_dir.join(file_path);
      let path_split = file_path
        .components()
        .filter_map(|x| {
        if let std::path::Component::Normal(x) = x {
          Some(x.to_str().and_then(|x| Some(x.to_string())))
        } else {
          None
        }
      })
        .map(|x| x.unwrap())
        .collect::<Vec<_>>();
      
      io_utils::build_tree(&mut root, &path_split, 0);
    }
  }

  root.sort();

  let mut id = 0;
  io_utils::build_ids(&mut root, &mut id);

  Ok(root)
}

#[tauri::command]
pub async fn cmd_load_project_packages(app: tauri::AppHandle, app_state: tauri::State<'_, AppState>, project_path: PathBuf, editor_version: String) -> Result<TgzPackageJson, errors::AnyError> {
  let packages_path = project_path
    .join("Packages")
    .join("manifest")
    .with_extension("json");

  let packages_lock_path = project_path
    .join("Packages")
    .join("packages-lock")
    .with_extension("json");

  let package_json_content = {
    if packages_path.exists() {
      std::fs::read_to_string(&packages_path)?
    } else {
      String::new()
    }
  };

  let packages_lock_content = {
    if packages_lock_path.exists() {
      std::fs::read_to_string(&packages_lock_path)?
    } else {
      String::new()
    }
  };
  
  let package = crate::template::extract_packages(&app, &app_state, &editor_version, &package_json_content, &packages_lock_content)?;
  Ok(package)
}