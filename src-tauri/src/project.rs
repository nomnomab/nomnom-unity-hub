use std::collections::HashMap;

use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};

use crate::{io_util, prefs, templates::{Dependency, Template}};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct GenerateProject {
    template: Template,
    output_folder: String,
    project_name: String,
    packages: Vec<Dependency>,
}

impl Default for GenerateProject {
    fn default() -> Self {
        Self { 
            template: Template::default(),
            output_folder: String::new(),
            project_name: String::new(),
            packages: Vec::new()
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
struct ManifestStub {
    dependencies: HashMap<String, String>
}

impl Default for ManifestStub {
    fn default() -> Self {
        Self { dependencies: HashMap::new() }
    }
}

#[tauri::command]
pub async fn generate_project(app: tauri::AppHandle, data: GenerateProject) -> Result<(), String> {
    let path = data.template.path.clone().unwrap();
    let tar_gz = std::fs::File::open(path).unwrap();
    let tar = GzDecoder::new(tar_gz);
    let mut ar = tar::Archive::new(tar);

    let output_folder = std::path::Path::new(&data.output_folder);
    if !output_folder.exists() {
        std::fs::create_dir_all(&output_folder).unwrap();
    }

    // extract files into <root>/project_name
    let output_folder = &output_folder.join(&data.project_name);
    ar.unpack(output_folder).unwrap();

    println!("Extracted template to {}", output_folder.display());

    // <root>/project_name/package/ProjectData~ is the project folder
    // need to pull ProjectData~ out to <root>/project_name
    let project_data_path = &output_folder.join("package").join("ProjectData~");
    io_util::copy_dir_all(project_data_path, output_folder).unwrap();

    println!("Copied project data to {}", output_folder.display());

    // remove package folder
    std::fs::remove_dir_all(&output_folder.join("package")).unwrap();

    // remove Library folder
    let library_folder = output_folder.join("Library");
    if library_folder.exists() {
        std::fs::remove_dir_all(&library_folder).unwrap();
    }

    // open manifest to edit it!
    let manifest_path = output_folder.join("Packages").join("manifest.json");
    let manifest = ManifestStub {
        dependencies: data.packages.iter().map(|x| (x.name.clone(), x.version.clone())).collect()
    };
    let json = serde_json::to_string_pretty(&manifest).unwrap();
    std::fs::write(manifest_path, json).unwrap();

    // make a project version json at ProjectSettings/ProjectVersion.txt
    let project_version_path = output_folder.join("ProjectSettings").join("ProjectVersion.txt");
    let project_version_content = format!("m_EditorVersion: {}", data.template.editor_version);
    std::fs::write(project_version_path, project_version_content).unwrap();

    // add project to list
    prefs::add_project(app, output_folder.to_str().unwrap().to_string()).unwrap();

    Ok(())
}

#[tauri::command]
pub fn change_project_editor_version(app: tauri::AppHandle, project_path: String, editor_version: String) {
    // let output_folder = std::path::Path::new(&project_path);
    // let project_version_path = output_folder.join("ProjectSettings").join("ProjectVersion.txt");
    // let project_version_content = format!("m_EditorVersion: {}", editor_version);
    // std::fs::write(project_version_path, project_version_content).unwrap();

    // println!("Changed project editor version to {}", editor_version);

    let mut prefs = prefs::get_prefs(app.clone());
    let project = prefs.projects.iter_mut().find(|x| x.path == project_path).unwrap();
    project.version = editor_version;
    prefs.save(&app).unwrap();

    println!("Saved prefs");
}

#[tauri::command]
pub fn is_valid_folder_dir(path: String, needs_empty: bool, needs_exists: bool) -> Result<(), String> {
    let path = std::path::Path::new(&path);
    let extension = path.extension();
    if let Some(_) = extension {
        return Err("The path is not a directory".to_string());
    }
    
    if path.exists() {
        // is it empty
        if needs_empty && path.read_dir().unwrap().next().is_some() {
            return Err("The directory is not empty".to_string());
        }
    } else if needs_exists {
        return Err("The directory does not exist".to_string());
    }

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err("The parent directory does not exist".to_string());
        }
    } else {
        return Err("Failed to get parent directory".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn is_valid_project_root_dir(path: String) -> bool {
    let path = std::path::Path::new(&path);
    if !path.exists() {
        return false;
    }
    let assets_dir = path.join("Assets");
    assets_dir.exists()
}

#[tauri::command]
pub fn is_valid_new_project_root_dir(path: String, name: String) -> Result<(), String> {
    if name.is_empty() {
        return Err("The project name cannot be empty".to_string());
    }
    
    let path = std::path::Path::new(&path).join(name);
    let extension = path.extension();
    if let Some(_) = extension {
        return Err("The path is not a directory".to_string());
    }
    
    if path.exists() {
        // is it empty
        if path.read_dir().unwrap().next().is_some() {
            return Err("The directory is not empty".to_string());
        }
    }

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err("The parent directory does not exist".to_string());
        }
    } else {
        return Err("Failed to get parent directory".to_string());
    }

    Ok(())
}