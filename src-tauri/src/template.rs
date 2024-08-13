use std::{collections::HashMap, io::Read, path::{self, Path, PathBuf}};
use flate2::read::GzDecoder;
use crate::{app::{self, AppState}, errors, io_utils};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceTemplate {
  pub name: String,
  pub version: String,
  pub path: PathBuf,
  pub editor_version: String
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TgzPackageJson {
    name: Option<String>,
    display_name: Option<String>,
    version: Option<String>,
    r#type: Option<String>, // `type` is a reserved keyword in Rust, so we use `r#type`
    host: Option<String>,
    unity: Option<String>,
    description: Option<String>,
    dependencies: Option<HashMap<String, String>>,
    _upm: Option<UPM>,
    upm_ci: Option<UpmCi>,
    repository: Option<Repository>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct PackageLockJson {
    dependencies: HashMap<String, PackageLockJsonDependency>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct PackageLockJsonDependency {
    version: String,
    depth: u32,
    source: String,
    dependencies: HashMap<String, String>,
    url: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UPM {
    changelog: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpmCi {
    footprint: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    url: Option<String>,
    r#type: Option<String>, // `type` is a reserved keyword in Rust, so we use `r#type`
    revision: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TgzPath {
  pub name: String,
  pub children: Vec<TgzPath>,
  pub is_allowed: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TgzPackageJsonRecord {
  pub tgz_package: TgzPackageJson,
  pub surface_template: SurfaceTemplate,
  pub pipelines: Vec<UnityPipeline>,
  pub disk_size_bytes: u64,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize)]
pub enum UnityPipeline {
  Unknown,
  BuiltIn,
  URP,
  HDRP,
  Custom,
}

// pub struct SurfaceTemplateRecord {
//   pub template: SurfaceTemplate,
//   pub category: String,
// }

pub fn get_core_templates_path(editor_version: String, app_state: &tauri::State<AppState>) -> Result<PathBuf, errors::AnyError> {
  let editor = app_state.editors.lock()
    .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?
    .iter()
    .find(|x| x.version == editor_version)
    .ok_or(errors::str_error("Invalid editor version"))?
    .clone();

  let root_path = crate::editor::get_root_folder(editor.exe_path.clone());
  let templates_path = root_path
    .ok_or(errors::io_not_found("Invalid editor path"))?
    .join("Editor")
    .join("Data")
    .join("Resources")
    .join("PackageManager")
    .join("ProjectTemplates");

  Ok(templates_path)
}

pub fn get_core_templates(editor_version: String, app_state: &tauri::State<AppState>) -> Result<Vec<SurfaceTemplate>, errors::AnyError> {
  let core_template_path = get_core_templates_path(editor_version.clone(), &app_state)?;
  let files = std::fs::read_dir(&core_template_path)
    .map_err(|_| errors::io_not_found("Invalid core template path"))?
    .filter_map(|x| x.ok())
    .filter(|x| x.path().extension().is_some_and(|x| x == "tgz"))
    .filter_map(|x| {
      let (name, version) = get_info_from_file_name(x.path())
        .ok()?;
      Some(SurfaceTemplate { name, version, path: x.path(), editor_version: editor_version.clone() })
    })
    .collect::<Vec<_>>();
  
  Ok(files)
}

fn get_info_from_file_name(path: impl AsRef<Path>) -> Result<(String, String), errors::AnyError> {
  let file_name = path.as_ref().file_name()
    .ok_or(errors::str_error("Invalid template file name"))?
    .to_str()
    .ok_or(errors::str_error("Invalid template file name"))?;
  let last_dash = file_name.rfind('-')
    .ok_or(errors::str_error("Invalid template file name"))?;

  let name = &file_name[0..last_dash];
  let version = &file_name[(last_dash + 1)..(file_name.len() - 4)];
  
  Ok((name.to_string(), version.to_string()))
}

pub fn get_user_templates_path(app_state: &tauri::State<AppState>) -> Result<PathBuf, errors::AnyError> {
  let appdata_path = app_state.prefs.lock()
    .map_err(|_| errors::str_error("Failed to get prefs. Is it locked?"))?
    .hub_appdata_path
    .clone()
    .ok_or(errors::str_error("hub_appdata_path not set"))?;

  let templates_path = appdata_path.join("templates");
  Ok(templates_path)
}

pub fn read_user_templates_manifest(editor_version: String, app_state: &tauri::State<AppState>) -> Result<serde_json::Map<String, serde_json::Value>, errors::AnyError> {
  let user_templates_path = get_user_templates_path(&app_state)?;
  let json_path = user_templates_path
    .join("manifest")
    .with_extension("json");

  let json = std::fs::read_to_string(&json_path)
    .map_err(|_| errors::io_not_found("Invalid user template manifest"))?;
  let manifest: HashMap<String, serde_json::Value> = serde_json::from_str(&json)
    .map_err(|_| errors::str_error("Invalid user template manifest"))?;

  if !manifest.contains_key(&editor_version) {
    return Ok(serde_json::Map::new());
  }

  let editor_value = manifest.get(&editor_version)
    .ok_or(errors::str_error("Invalid editor version"))?;

  if !editor_value.is_object() {
    return Err(errors::str_error("Invalid editor value"));
  }

  let deps = editor_value.get("dependencies")
    .ok_or(errors::str_error("Invalid editor value"))?;

  if !deps.is_object() {
    return Err(errors::str_error("Invalid editor value"));
  }

  let values = deps.as_object()
    .ok_or(errors::str_error("Invalid editor value"))?;
  Ok(values.clone())
}

pub fn get_user_templates(editor_version: String, app_state: &tauri::State<AppState>) -> Result<Vec<SurfaceTemplate>, errors::AnyError> {
  let templates = read_user_templates_manifest(editor_version.clone(), &app_state)?;

  let user_templates_path = get_user_templates_path(&app_state)?;
  let files = std::fs::read_dir(&user_templates_path)
    .map_err(|_| errors::io_not_found("Invalid user template path"))?
    .filter_map(|x| x.ok())
    .filter(|x| x.path().extension().is_some_and(|x| x == "tgz"))
    .filter_map(|x| {
      let (name, version) = get_info_from_file_name(x.path())
        .ok()?;
      Some(SurfaceTemplate { name, version, path: x.path(), editor_version: editor_version.clone() })
    })
    .filter(|x| {
      let value = templates.get(&x.name);
      value.is_some()
    });

  Ok(files.collect())
}

pub fn extract_template_information(app: &tauri::AppHandle, surface_template: &SurfaceTemplate) -> Result<TgzPackageJsonRecord, errors::AnyError> {
  let file_name = surface_template.path.file_name()
    .ok_or(errors::str_error("Invalid template file name"))?;

  let cache_dir = app.path_resolver().app_cache_dir()
    .ok_or(errors::str_error("Invalid app cache dir"))?
    .join("templates")
    .join(file_name);
  std::fs::create_dir_all(&cache_dir)?;

  let package_json_path = cache_dir
    .join("package")
    .with_extension("json");

  let mut package_json_contents = None;
  let mut package_lock_json_contents = None;

  if package_json_path.exists() {
    // no need to extract tgz file!
    package_json_contents = Some(std::fs::read_to_string(&package_json_path)?);
  } else {
    // need to extract tgz file, so dumb
    println!("Extracting {:?}", surface_template.path);
    let tar_gz = std::fs::File::open(&surface_template.path)?;
    let tar_decoder = GzDecoder::new(tar_gz);
    let mut tar = tar::Archive::new(tar_decoder);

    let package_path = std::path::Path::new("package")
      .join("package")
      .with_extension("json");

    let package_lock_path = std::path::Path::new("package")
      .join("ProjectData~")
      .join("Packages")
      .join("packages-lock")
      .with_extension("json");

    let mut new_contents = String::new();
    let mut new_lock_contents = String::new();

    tar
      .entries()
      .map_err(|_| errors::str_error("Invalid template tgz"))?
      .filter_map(|x| x.ok())
      .filter(|x| x.path().is_ok_and(|x| &*x == package_path) || x.path().is_ok_and(|x| &*x == package_lock_path))
      .for_each(|mut x| {
        if x.path().is_ok_and(|x| &*x == package_path) {
          x
            .read_to_string(&mut new_contents)
            .map_err(|_| errors::str_error("Could not read template.tgz"))
            .unwrap();
        } else if x.path().is_ok_and(|x| &*x == package_lock_path) {
          x
            .read_to_string(&mut new_lock_contents)
            .map_err(|_| errors::str_error("Could not read template.tgz"))
            .unwrap();
        }
      });
      // .next()
      // .ok_or(errors::str_error("Could not find package.json in template tgz"))?
      // .read_to_string(&mut new_contents)
      // .map_err(|_| errors::str_error("Could not read template.tgz"))?;

    package_json_contents = Some(new_contents);
    package_lock_json_contents = Some(new_lock_contents);
  }

  if let Some(package_json_contents) = package_json_contents {
    // load json contents then save to disk
    let mut package_json: TgzPackageJson = serde_json::from_str(&package_json_contents)
      .map_err(|_| errors::str_error("Invalid package.json"))?;

    if let Some(package_lock_json_contents) = package_lock_json_contents {
      if !package_lock_json_contents.is_empty() {
        let package_lock_json: PackageLockJson = serde_json::from_str(&package_lock_json_contents)
          .map_err(|_| errors::str_error("Invalid package-lock.json"))?;

        // extract all of the dependencies + subdepdependencies
        let mut found_deps = HashMap::new();

        for (key, value) in package_lock_json.dependencies {
          if &value.source != "builtin" {
            continue;
          }

          found_deps.insert(key, value.version);

          for (subkey, subvalue) in value.dependencies {
            found_deps.insert(subkey, subvalue);
          }
        }

        package_json.dependencies = Some(found_deps);
      }
    }

    let package_record = TgzPackageJsonRecord {
      tgz_package: package_json.clone(),
      surface_template: surface_template.clone(),
      pipelines: detect_unity_pipeline(&package_json),
      disk_size_bytes: io_utils::file_size(surface_template.path.clone()).unwrap_or(0)
    };

    let json = serde_json::to_string(&package_json)
      .map_err(|_| errors::str_error("Invalid package.json"))?;
    std::fs::write(&package_json_path, json)
      .map_err(|_| errors::str_error("Invalid package.json"))?;
    
    return Ok(package_record);
  }
  
  Err(errors::str_error("Could not find package.json in template tgz"))
}

fn detect_unity_pipeline(tgz_package: &TgzPackageJson) -> Vec<UnityPipeline> {
  let mut pipelines = Vec::new();
  if let Some(deps) = &tgz_package.dependencies {
    // check for URP
    let has_urp = deps.contains_key("com.unity.render-pipelines.universal");
    let has_hdrp = deps.contains_key("com.unity.render-pipelines.high-definition");
    let has_custom_srp = deps.contains_key("com.unity.render-pipelines.core");
    
    if has_urp {
      pipelines.push(UnityPipeline::URP);
    }

    // check for HDRP
    if has_hdrp {
      pipelines.push(UnityPipeline::HDRP);
    }

    // check for custom SRP
    if has_custom_srp {
      pipelines.push(UnityPipeline::Custom);
    }

    // check for builtin
    if !has_urp && !has_hdrp && !has_custom_srp {
      pipelines.push(UnityPipeline::BuiltIn);
    }
  }
  pipelines
}

fn extract_file_paths(app: &tauri::AppHandle, surface_template: &SurfaceTemplate) -> Result<io_utils::FileDir, errors::AnyError> {
  let file_name = surface_template.path.file_name()
    .ok_or(errors::str_error("Invalid template file name"))?;

  let cache_dir = app.path_resolver().app_cache_dir()
    .ok_or(errors::str_error("Invalid app cache dir"))?
    .join("templates")
    .join(file_name);
  std::fs::create_dir_all(&cache_dir)?;

  // need to extract tgz file, so dumb
  let tar_gz = std::fs::File::open(&surface_template.path)?;
  let tar_decoder = GzDecoder::new(tar_gz);
  let mut tar = tar::Archive::new(tar_decoder);

  let mut valid_entries = tar
    .entries()
    .map_err(|_| errors::str_error("Invalid template tgz"))?
    .filter_map(|x| x.ok());

  let mut file_paths = Vec::new();
  let library_part = std::path::Path::new("Library");
  let project_data_part = std::path::Path::new("ProjectData~");
  for entry in valid_entries.into_iter() {
    let path = entry
      .path()
      .map_err(|_| errors::str_error("Invalid template tgz"))?
      .to_path_buf();

    let skip = {
      let mut skip = false;
      for (i, part) in path.iter().enumerate() {
        if part == &project_data_part {
          let next_part = path.iter().nth(i + 1);
          if let Some(next_part) = next_part {
            if next_part == &library_part {
              skip = true;
              break;
            }
          }
        }
      }

      skip
    };

    if !skip {
      file_paths.push(path);
    }
  }

  // file_paths.sort_by(|a, b| {
  //   let a_extension = a.extension();
  //   let b_extension = b.extension();

  //   if a_extension.is_some() && b_extension.is_none() { std::cmp::Ordering::Equal }
  //   else if a_extension.is_none() && b_extension.is_some() { std::cmp::Ordering::Greater }
  //   else { a.file_name().cmp(&b.file_name()) }
  // });

  // turn file paths into a file tree
  let mut dir = io_utils::dir("package");
  for file_path in file_paths.iter() {
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

    io_utils::build_tree(&mut dir, &path_split, 0);
  }

  Ok(dir)
}

// commands

#[tauri::command]
pub async fn cmd_get_surface_templates(editor_version: String, app_state: tauri::State<'_, AppState>) -> Result<Vec<SurfaceTemplate>, errors::AnyError> {
  let mut templates = get_core_templates(editor_version.clone(), &app_state)?;
  templates.extend(get_user_templates(editor_version.clone(), &app_state)?);
  Ok(templates)
}

#[tauri::command]
pub async fn cmd_get_template_information(app_handle: tauri::AppHandle, surface_template: SurfaceTemplate) -> Result<TgzPackageJsonRecord, errors::AnyError> {
  let template = extract_template_information(&app_handle, &surface_template)?;
  Ok(template)
}

#[tauri::command]
pub async fn cmd_get_template_file_paths(app_handle: tauri::AppHandle, surface_template: SurfaceTemplate) -> Result<io_utils::FileDir, errors::AnyError> {
  let mut paths = extract_file_paths(&app_handle, &surface_template)?;
  paths.sort();

  let paths = paths.children.get(0)
    .ok_or(errors::str_error("Invalid template tgz"))?;

  let mut paths = *paths.clone();
  let mut id = 0u64;
  io_utils::build_ids(&mut paths, &mut id);

  Ok(paths)
}

#[tauri::command]
pub fn cmd_delete_template(app_state: tauri::State<'_, AppState>, surface_template: SurfaceTemplate, editor_version: String) -> Result<(), errors::AnyError> {
  std::fs::remove_file(&surface_template.path)?;

  let prefs = app::get_prefs(&app_state)?;
  let template_manifest_path = &prefs.hub_appdata_path
    .ok_or(errors::str_error("hub_appdata_path not set"))?
    .join("Templates")
    .join("manifest.json");

  let template_manifest_str = std::fs::read_to_string(&template_manifest_path)?;
  let mut template_manifest_json: serde_json::Map<String, serde_json::Value> = serde_json::from_str(&template_manifest_str)?;

  if !template_manifest_json.contains_key(&editor_version) { 
    return Ok(());
  }

  let editor_version_entry = template_manifest_json.get_mut(&editor_version)
    .ok_or(errors::str_error("Failed to get editor version entry"))?
    .as_object_mut()
    .ok_or(errors::str_error("Failed to get editor version entry"))?;

  if let Some(dependency_map) = editor_version_entry.get_mut("dependencies") {
    if let Some(dependency_map) = dependency_map.as_object_mut() {
      dependency_map.remove(surface_template.name.as_str());
      let template_manifest_str = serde_json::to_string(&template_manifest_json)?;
      std::fs::write(&template_manifest_path, template_manifest_str)?;
    }
  }

  Ok(())
}