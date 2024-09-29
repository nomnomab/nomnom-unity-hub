use std::{collections::HashMap, path::PathBuf};

use flate2::{read::GzDecoder, write::GzEncoder};

use crate::{app::{self, AppState}, editor::{self, UnityEditorInstall}, errors, io_utils, package::{self, MinimalPackage}, template::{EditorVersionPackageList, SurfaceTemplate}};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateInfoForGeneration {
  template: Option<SurfaceTemplate>,
  editor_version: UnityEditorInstall,
  packages: Vec<MinimalPackage>,
  selected_files: Vec<PathBuf>,
  is_empty: bool
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTemplateInfoForGeneration {
  project_path: PathBuf,
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
  name: String,
  display_name: String,
  version: String,
  description: String
}

// generate a new project from a template + info
pub fn generate_project(app: &tauri::AppHandle, app_state: &tauri::State<'_, AppState>, project_info: &ProjectInfoForGeneration, template_info: &TemplateInfoForGeneration) -> Result<PathBuf, errors::AnyError> {
  let package_cache_dir_out = &project_info.path.join(project_info.name.clone());
  if package_cache_dir_out.exists() {
    return Err(errors::str_error(format!("Project already exists at {}", package_cache_dir_out.display()).as_str()));
  }

  let cached_editor_packages = crate::template::read_editor_version_packages(&app, &template_info.editor_version.version.clone())?;

  let package_cache_dir = io_utils::get_cache_appended_dir(app, "new_project_package")?;
  if template_info.is_empty {
    // make a new project
    // copy entire project over
    // modify manifest

    let editor_version = &template_info.editor_version.version;
    let package_cache_dir_out_str = package_cache_dir_out
      .to_str()
      .ok_or(errors::str_error("Failed to convert path to string"))?
      .to_string();
    let args = vec!["-createProject".to_string(), package_cache_dir_out_str, "-quit".to_string()];
    editor::open(editor_version.clone(), args, &app_state, true)?;

    let packages_dir = package_cache_dir_out
      .join("Packages");
    modify_package_json(&packages_dir, &template_info.packages, &package_cache_dir_out, &cached_editor_packages)?;
  } else {
    let packages_dir = package_cache_dir
      .join("package")
      .join("ProjectData~")
      .join("Packages");
    
    unpack_package_into_cache(&package_cache_dir, &template_info)?;
    modify_package_json(&packages_dir, &template_info.packages, &package_cache_dir_out, &cached_editor_packages)?;
  }

  // create project directory
  std::fs::create_dir_all(&package_cache_dir_out.join("Assets"))?;
  std::fs::create_dir_all(&package_cache_dir_out.join("ProjectSettings"))?;
  std::fs::create_dir_all(&package_cache_dir_out.join("Packages"))?;

  // copy contents from ProjectData~ to output
  let project_data_root = PathBuf::from("package").join("ProjectData~");

  if !template_info.is_empty {
    for file in template_info.selected_files.iter().filter(|x| x.starts_with(&project_data_root)) {
      let trimmed_file = file.strip_prefix(&project_data_root)
        .map_err(|_| errors::str_error("Failed to strip prefix"))?;
      let from = package_cache_dir.join(file);
      let dest = package_cache_dir_out.join(trimmed_file);
      // println!("Copying {} to {}", from.display(), dest.display());

      // std::fs::create_dir_all(&dest)?;
      
      if dest.extension().is_none() {
        // println!("Creating directory dest: {}", dest.display());
        std::fs::create_dir_all(&dest)?;
      } else {
        // println!("Creating directory parent: {} for {}", dest.parent().unwrap().display(), dest.display());
        std::fs::create_dir_all(dest.parent().unwrap())?;
        if let Err(err) = std::fs::copy(&from, &dest) {
          println!("Failed to copy from {} to {}: {}", from.display(), dest.display(), err);
        }
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
  std::fs::write(&editor_version_path, &editor_version)?;

  create_gitignore(package_cache_dir_out)?;

  let manifest_path = package_cache_dir_out
    .join("Packages")
    .join("manifest")
    .with_extension("json");
  let package_contents = std::fs::read_to_string(&manifest_path)?;
  let package_contents: HashMap<String, serde_json::Value> = serde_json::from_str(&package_contents)?;

  if !package_contents.contains_key("from_project") {
    // create package-lock file
    let package_lock_path = package_cache_dir_out
      .join("Packages")
      .join("packages-lock")
      .with_extension("json");

    let lock_dependencies = template_info.packages
      .iter()
      .filter(|x| cached_editor_packages.packages.get(&x.name).is_some())
      .collect::<Vec<_>>();
    let mut serde_hash_map = serde_json::Map::new();
    for dep in lock_dependencies.iter() {
      let value = cached_editor_packages.packages.get(&dep.name).unwrap();
      serde_hash_map.insert(dep.name.clone(), serde_json::to_value(value)?);
    }

    let json_str = serde_json::json!({
      "dependencies": serde_hash_map
    });
    std::fs::write(&package_lock_path, serde_json::to_string_pretty(&json_str)?)?;
  }

  let project_settings_path = package_cache_dir_out
    .join("ProjectSettings")
    .join("ProjectSettings.asset");

  if project_settings_path.is_file() {
    let project_settings = std::fs::read_to_string(&project_settings_path)?;
    let mut lines = project_settings.lines().collect::<Vec<_>>();

    for line in lines.iter_mut() {
      let trimmed_line = line.trim();
      if trimmed_line.starts_with("companyName: ") {
        *line = "  companyName: DefaultCompany";
        continue;
      }

      if trimmed_line.starts_with("productName: ") {
        *line = &format!("  productName: {}", project_info.name.clone());
        break;
      }
    }

    std::fs::write(&project_settings_path, project_settings)?;
  }

  // let out_path = package_cache_dir_out
  //   .to_str()
  //   .ok_or(errors::str_error("Failed to convert path to string"))?
  //   .to_string();
  // println!("out path: {}", out_path);
  
  // let embedded_cs_script = include_str!("assets/PackageClientTest.cs");
  // let embedded_cs_script_path = package_cache_dir_out
  //   .join("Assets")
  //   .join("PackageClientTest.cs");

  // println!("writing script: {}", embedded_cs_script_path.display());
  // std::fs::write(&embedded_cs_script_path, embedded_cs_script)?;

  // println!("running script: {}", embedded_cs_script_path.display());
  // crate::editor::open(template_info.editor_version.version.clone(), vec!["-quit".to_string(), "-batchmode".to_string(), "-projectPath".to_string(), format!("{}", out_path).to_string(), "-executeMethod".to_string(), "PackageClientTest.PerformCheck".to_string()], app_state, true)?;

  // // delete script
  // println!("deleting script: {}", embedded_cs_script_path.display());
  // std::fs::remove_file(&embedded_cs_script_path)?;
  
  // crate::project::update_project_open_time(app_state, package_cache_dir_out.clone(), app)?;
  // crate::project::cmd_open_project_in_editor(app.clone(), app_state.clone(), package_cache_dir_out.clone(), editor_version.clone())?;
  
  Ok(package_cache_dir_out.clone())
}

// generate a new template file
pub fn generate_template(app: &tauri::AppHandle, app_state: &tauri::State<AppState>, template_info: &NewTemplateInfo) -> Result<PathBuf, errors::AnyError> {
  let package_cache_dir = io_utils::get_cache_appended_dir(app, "new_template_package")?;
  let package_cache_dir_out = io_utils::get_cache_appended_dir(app, "new_template_package_output")?;

  let cached_editor_packages = crate::template::read_editor_version_packages(&app, &template_info.template.editor_version.version.clone())?;

  unpack_package_into_cache(&package_cache_dir, &template_info.template)?;
  modify_package_json(&package_cache_dir, &template_info.template.packages, &package_cache_dir_out, &cached_editor_packages)?;

  // modify package.json
  let package_json_path = package_cache_dir
    .join("package")
    .join("package.json");

  let mut dependency_map = serde_json::Map::new();
  for package in template_info.template.packages.iter() {
    let name = package.name.clone();
    let version = package.version.clone();
    dependency_map.insert(name, serde_json::Value::String(version));
  }
  
  let new_package_json = serde_json::json!({
    "name": template_info.name.clone(),
    "displayName": template_info.display_name.clone(),
    "version": template_info.version.clone(),
    "type": "template",
    "host": "hub",
    "unity": template_info.template.editor_version.version.clone(),
    "description": template_info.description.clone(),
    "dependencies": dependency_map,
  });
  println!("Writing new package.json: {}", package_json_path.display());
  std::fs::write(&package_json_path, serde_json::to_string_pretty(&new_package_json)?)?;

  // copy contents from package to output
  let data_root = PathBuf::from("package");
  for file in template_info.template.selected_files.iter().filter(|x| x.starts_with(&data_root)) {
    let trimmed_file = file.strip_prefix(&data_root)
      .map_err(|_| errors::str_error("Failed to strip prefix"))?;
    let from = package_cache_dir.join(file);
    let dest = package_cache_dir_out.join(trimmed_file);
    // println!("Copying {} to {}", from.display(), dest.display());
    
    if dest.extension().is_none() {
      // println!("Creating directory dest: {}", dest.display());
      std::fs::create_dir_all(&dest)?;
    } else {
      // println!("Creating directory parent: {} for {}", dest.parent().unwrap().display(), dest.display());
      std::fs::create_dir_all(dest.parent().unwrap())?;
      if let Err(err) = std::fs::copy(&from, &dest) {
        println!("Failed to copy from {} to {}: {}", from.display(), dest.display(), err);
      }
    }
  }

  std::fs::create_dir_all(&package_cache_dir_out.join("ProjectData~"))?;
  std::fs::create_dir_all(&package_cache_dir_out.join("ProjectData~").join("Assets"))?;
  std::fs::create_dir_all(&package_cache_dir_out.join("ProjectData~").join("Packages"))?;

  // let project_settings_path = &package_cache_dir_out.join("ProjectData~").join("ProjectSettings");
  // let project_settings_path_exists = project_settings_path.exists();
  // std::fs::create_dir_all(&project_settings_path)?;

  // if !project_settings_path_exists {
  //   let project_version_txt = format!("m_EditorVersion: {}", template_info.template.editor_version.version.clone());
  //   std::fs::write(&project_settings_path.join("ProjectVersion.txt"), project_version_txt)?;
  // }

  // build a new tgz file
  let prefs = app::get_prefs(&app_state)?;
  let output_path = &prefs.hub_appdata_path.clone()
    .ok_or(errors::str_error("hub_appdata_path not set"))?
    .join("Templates")
    .join(format!("{}-{}.tgz", template_info.name, template_info.version));

  let tgz = GzEncoder::new(std::fs::File::create(&output_path)?, flate2::Compression::default());
  let mut tar = tar::Builder::new(tgz);
  tar.append_dir_all("package", &package_cache_dir_out)?;
  tar.finish()?;

  // remove cache
  std::fs::remove_dir_all(&package_cache_dir)?;
  std::fs::remove_dir_all(&package_cache_dir_out)?;

  insert_template_into_hub_database(&prefs, template_info)?;
  
  Ok(output_path.clone())
}

fn insert_template_into_hub_database(prefs: &crate::prefs::Prefs, template_info: &NewTemplateInfo) -> Result<(), errors::AnyError> {
  // modify the appdata template manifest.json
  let template_manifest_path = &prefs.hub_appdata_path.as_ref()
    .ok_or(errors::str_error("hub_appdata_path not set"))?
    .join("Templates")
    .join("manifest.json");

  let template_manifest_str = std::fs::read_to_string(&template_manifest_path)?;
  let mut template_manifest_json: serde_json::Map<String, serde_json::Value> = serde_json::from_str(&template_manifest_str)?;

  // make version if needed
  let editor_version = template_info.template.editor_version.version.clone();
  if !template_manifest_json.contains_key(&editor_version) { 
    template_manifest_json.insert(editor_version.clone(), serde_json::json!({}));
  }
  let editor_version_entry = template_manifest_json.get_mut(&editor_version)
    .ok_or(errors::str_error("Failed to get editor version entry"))?;

  let dependency_map = editor_version_entry
    .as_object_mut()
    .ok_or(errors::str_error("Failed to get editor version entry"))?
    .get_mut("dependencies")
    .ok_or(errors::str_error("Failed to get editor version entry"))?
    .as_object_mut()
    .ok_or(errors::str_error("Failed to get editor version entry"))?;

  dependency_map.insert(template_info.name.clone(), serde_json::Value::String(template_info.version.clone()));
  let template_manifest_str = serde_json::to_string(&template_manifest_json)?;
  std::fs::write(&template_manifest_path, template_manifest_str)?;

  Ok(())
}

fn generate_template_from_project(app: &tauri::AppHandle, app_state: &tauri::State<AppState>, template_info: &ProjectTemplateInfoForGeneration, new_template_info: &NewTemplateInfo) -> Result<PathBuf, errors::AnyError> {
  let cache_path = io_utils::get_cache_appended_dir(&app, "project_template")?;
  let cache_package_path = cache_path.join("package");

  if !cache_package_path.exists() {
    std::fs::create_dir_all(&cache_package_path)?;
  }

  // copy files into cache_path
  let root_path = "package";
  for file in &new_template_info.template.selected_files {
    let file = file.strip_prefix(root_path);
    if let Ok(file) = file {
      let file_from = template_info.project_path.join(file);
      let file_to = cache_package_path.join("ProjectData~").join(file);

      // println!("{:?} -> {:?}", file_from, file_to);

      if file_from.is_dir() {
        std::fs::create_dir_all(file_to)?;
      } else {
        let folder_to = file_to.parent()
          .ok_or(errors::str_error("Bad parent found"))?;
        std::fs::create_dir_all(&folder_to);
        std::fs::copy(&file_from, &file_to)?;
      }
    }
  }

  // create package.json file for template
  let package_json_path = cache_package_path
    .join("package")
    .with_extension("json");

  // read packages from project's manifest.json
  let project_manifest_path = cache_package_path
    .join("ProjectData~")
    .join("Packages")
    .join("manifest")
    .with_extension("json");

  let package_manifest = std::fs::read_to_string(&project_manifest_path)?;
  let package_manifest: HashMap<String, serde_json::Value> = serde_json::from_str(&package_manifest)?;
  let default_map = serde_json::to_value(serde_json::Map::new()).unwrap();
  let package_manifest_dependencies = package_manifest
    .get("dependencies")
    .unwrap_or(&default_map);

  let new_package_json = serde_json::json!({
    "name": new_template_info.name.clone(),
    "displayName": new_template_info.display_name.clone(),
    "version": new_template_info.version.clone(),
    "type": "template",
    "host": "hub",
    "unity": new_template_info.template.editor_version.version.clone(),
    "description": new_template_info.description.clone(),
    "dependencies": package_manifest_dependencies,
    "from_project": true
  });
  std::fs::write(&package_json_path, serde_json::to_string_pretty(&new_package_json)?)?;

  let prefs = app::get_prefs(&app_state)?;
  let output_path = &prefs.hub_appdata_path.clone()
    .ok_or(errors::str_error("hub_appdata_path not set"))?
    .join("Templates")
    .join(format!("{}-{}.tgz", new_template_info.name, new_template_info.version));

  let tgz = GzEncoder::new(std::fs::File::create(output_path)?, flate2::Compression::default());
  let mut tar = tar::Builder::new(tgz);
  tar.append_dir_all("package", cache_package_path)?;
  tar.finish()?;

  // clear cache
  std::fs::remove_dir_all(&cache_path);

  insert_template_into_hub_database(&prefs, &new_template_info)?;

  Ok(output_path.clone())
}

fn unpack_package_into_cache(output: &PathBuf, template_info: &TemplateInfoForGeneration) -> Result<(), errors::AnyError> {
  if template_info.template.is_none() {
    let package_path = output.join("package");
    std::fs::create_dir_all(&package_path)?;
    
    return Ok(());
  }
  
  let template = template_info.template
    .as_ref()
    .ok_or(errors::str_error("Template not found"))?
    .clone();

  let tgz_path = template.path;
  let tgz = std::fs::File::open(&tgz_path)?;
  let tar_decoder = GzDecoder::new(tgz);
  let mut tar = tar::Archive::new(tar_decoder);

  // extract it all to the cache
  tar.unpack(&output)?;

  Ok(())
}

fn modify_package_json(json_root: &PathBuf, packages: &Vec<MinimalPackage>, output_path: &PathBuf, cached_editor_packages: &EditorVersionPackageList) -> Result<(), errors::AnyError> {
  // modify package.json for dependencies
  std::fs::create_dir_all(&json_root)?;
  
  let manifest_json = json_root
    .join("manifest")
    .with_extension("json");

  let packages_lock_json = json_root
    .join("packages-lock")
    .with_extension("json");

  if packages_lock_json.exists() {
    std::fs::remove_file(&packages_lock_json)?;
  }

  // read any local packages
  let local_packages = packages
    .iter()
    .filter(|x| x._type == package::PackageType::Local && !x.name.starts_with("com.unity.template."))
    .collect::<Vec<_>>();

  let rest_packages = packages
    .iter()
    .filter(|x| x._type != package::PackageType::Local && !x.name.starts_with("com.unity.template."))
    .collect::<Vec<_>>();

  let manifest_json_contents = {
    if !manifest_json.exists() {
      "{}".to_string()
    } else {
      std::fs::read_to_string(&manifest_json)?
    }
  };
  let mut manifest_json_contents: HashMap<String, serde_json::Value> 
    = serde_json::from_str(&manifest_json_contents)?;
  
  let mut dependencies: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

  // override the dependencies
  for package in rest_packages.iter() {
    println!("Rest package: {:?}", package);
    let name = package.name.clone();
    let version = package.version.clone();

    let is_bad = {
      if let Some(package) = cached_editor_packages.packages.get(&name) {
        if package.source.as_ref().is_some_and(|x| x == "embedded") {
          true
        } else {
          false
        }
      } else {
        false
      }
    };

    if is_bad {
      continue;
    }

    dependencies.insert(name, serde_json::Value::String(version));
  }

  // local ones now
  for package in local_packages.iter() {
    println!("Local package: {:?}", package);
    // get local path from this project to the json path in name
    let package_json_path = std::path::Path::new(&package.name).to_path_buf();
    let package_json_path_parent = package_json_path
      .parent()
      .ok_or(errors::str_error("Failed to get parent"))?;
    let relative_path = io_utils::diff_paths(&package_json_path_parent, &output_path.join("Packages"));

    let relative_path = match relative_path {
      Some(path) => path.to_path_buf(),
      None => package_json_path.clone()
    };

    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct JsonData {
      name: String,
    }

    let json = std::fs::read_to_string(&package_json_path)?;
    let json: JsonData = serde_json::from_str(&json)
      .map_err(|err| errors::str_error(&format!("Failed to parse json from {}, error: {:?}", package_json_path.display(), err)))?;
    
    let name = json.name.clone();
    let version = format!("file:{}", relative_path
      .to_str()
      .ok_or(errors::str_error("Failed to get str"))?
      .replace("\\", "/")
    );
    dependencies.insert(name, serde_json::Value::String(version));
  }
  
  manifest_json_contents.insert("dependencies".to_string(), serde_json::Value::Object(dependencies));

  // save to disk
  let manifest_json_contents = serde_json::to_string_pretty(&manifest_json_contents)?;
  std::fs::write(&manifest_json, manifest_json_contents)?;

  Ok(())
}

fn create_gitignore(output_path: &PathBuf) -> Result<(), errors::AnyError> {
  let embedded_gitignore = include_str!("assets/unity.gitignore");
  let gitignore_path = output_path.join(".gitignore");
  if !gitignore_path.exists() {
    std::fs::write(&gitignore_path, embedded_gitignore)?;
  }
  Ok(())
}

// commands

#[tauri::command]
pub async fn cmd_generate_project(app: tauri::AppHandle, app_state: tauri::State<'_, AppState>, project_info: ProjectInfoForGeneration, template_info: TemplateInfoForGeneration) -> Result<PathBuf, errors::AnyError> {
  let output = generate_project(&app, &app_state, &project_info, &template_info)?;
  Ok(output)
}

#[tauri::command]
pub async fn cmd_generate_template(app: tauri::AppHandle, app_state: tauri::State<'_, AppState>, template_info: NewTemplateInfo) -> Result<PathBuf, errors::AnyError> {
  let output = generate_template(&app, &app_state, &template_info)?;
  Ok(output)
}

#[tauri::command]
pub async fn cmd_generate_template_from_project(app: tauri::AppHandle, app_state: tauri::State<'_, AppState>, template_info: ProjectTemplateInfoForGeneration, new_template_info: NewTemplateInfo) -> Result<PathBuf, errors::AnyError> {
  let output = generate_template_from_project(&app, &app_state, &template_info, &new_template_info)?;
  Ok(output)
}