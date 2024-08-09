use std::{collections::HashMap, path::PathBuf};

use flate2::read::GzDecoder;

use crate::{editor::UnityEditorInstall, errors, io_utils, package::MinimalPackage, template::SurfaceTemplate};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateInfoForGeneration {
  template: Option<SurfaceTemplate>,
  editor_version: UnityEditorInstall,
  packages: Vec<MinimalPackage>,
  selected_files: Vec<PathBuf>
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfoForGeneration {
  name: String,
  path: PathBuf
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTemplateInfo {
  template: TemplateInfoForGeneration,
  name: String
}

// generate a new project from a template + info
pub fn generate_project(app: &tauri::AppHandle, project_info: &ProjectInfoForGeneration, template_info: &TemplateInfoForGeneration) -> Result<PathBuf, errors::AnyError> {
  // if !project_info.path.is_dir() {
  //   return Err(errors::str_error("Project path is not a directory"));
  // }
  
  let package_cache_dir_out = &project_info.path.join(project_info.name.clone());
  if package_cache_dir_out.exists() {
    return Err(errors::str_error(format!("Project already exists at {}", package_cache_dir_out.display()).as_str()));
  }

  let template = template_info.template
    .as_ref()
    .ok_or(errors::str_error("Template not found"))?
    .clone();

  let tgz_path = template.path;
  let tgz = std::fs::File::open(&tgz_path)?;
  let tar_decoder = GzDecoder::new(tgz);
  let mut tar = tar::Archive::new(tar_decoder);

  let package_cache_dir = io_utils::get_cache_appended_dir(app, "new_project_package");
  // let package_cache_dir_out = io_utils::get_cache_appended_dir(app, "new_project_package_out");

  // extract it all to the cache
  tar.unpack(&package_cache_dir)?;

  // modify package.json for dependencies
  let packages_dir = package_cache_dir
    .join("package")
    .join("ProjectData~")
    .join("Packages");
  let manifest_json = packages_dir
    .join("manifest")
    .with_extension("json");

  let packages_lock_json = packages_dir
    .join("packages-lock")
    .with_extension("json");

  println!("packages_dir: {}", packages_dir.display());
  println!("manifest_json: {}", manifest_json.display());
  println!("packages_lock_json: {}", packages_lock_json.display());
  println!("package_cache_dir_out: {}", package_cache_dir_out.display());

  if packages_lock_json.exists() {
    std::fs::remove_file(&packages_lock_json)?;
  }

  let manifest_json_contents = std::fs::read_to_string(&manifest_json)?;
  let mut manifest_json_contents: HashMap<String, serde_json::Value> 
    = serde_json::from_str(&manifest_json_contents)?;
  
  let mut dependencies: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

  // override the dependencies
  for package in template_info.packages.iter() {
    let name = package.name.clone();
    let version = package.version.clone();
    dependencies.insert(name, serde_json::Value::String(version));
  }
  manifest_json_contents.insert("dependencies".to_string(), serde_json::Value::Object(dependencies));

  // save to disk
  let manifest_json_contents = serde_json::to_string_pretty(&manifest_json_contents)?;
  std::fs::write(&manifest_json, manifest_json_contents)?;

  // create project directory
  std::fs::create_dir(&package_cache_dir_out)?;

  // copy contents from ProjectData~ to output
  let project_data_root = PathBuf::from("package").join("ProjectData~");
  for file in template_info.selected_files.iter().filter(|x| x.starts_with(&project_data_root)) {
    let trimmed_file = file.strip_prefix(&project_data_root)
      .map_err(|_| errors::str_error("Failed to strip prefix"))?;
    let from = package_cache_dir.join(file);
    let dest = package_cache_dir_out.join(trimmed_file);
    println!("Copying {} to {}", from.display(), dest.display());
    
    if dest.extension().is_none() {
      println!("Creating directory dest: {}", dest.display());
      std::fs::create_dir_all(&dest)?;
    } else {
      println!("Creating directory parent: {} for {}", dest.parent().unwrap().display(), dest.display());
      std::fs::create_dir_all(dest.parent().unwrap())?;
      if let Err(err) = std::fs::copy(&from, &dest) {
        println!("Failed to copy from {} to {}: {}", from.display(), dest.display(), err);
      }
    }
  }

  // remove cache
  std::fs::remove_dir_all(&package_cache_dir)?;
  // std::fs::remove_dir_all(&package_cache_dir_out)?;

  // write EditorVersion.txt
  let editor_version_path = &package_cache_dir_out
    .join("ProjectSettings")
    .join("ProjectVersion")
    .with_extension("txt");

  let editor_version = template_info.editor_version.version.clone();
  let editor_version = format!("m_EditorVersion: {}", editor_version);
  println!("EditorVersion: {}", editor_version);
  println!("EditorVersion path: {}", editor_version_path.display());
  std::fs::write(&editor_version_path, editor_version)?;
  
  Ok(package_cache_dir_out.clone())
}

// generate a new template file
pub fn generate_template(template_info: &NewTemplateInfo) -> Result<(), errors::AnyError> {
  Ok(())
}

// commands

#[tauri::command]
pub async fn cmd_generate_project(app: tauri::AppHandle, project_info: ProjectInfoForGeneration, template_info:TemplateInfoForGeneration) -> Result<PathBuf, errors::AnyError> {
  let output = generate_project(&app, &project_info, &template_info)?;
  Ok(output)
}