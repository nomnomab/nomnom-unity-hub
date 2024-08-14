use std::collections::HashMap;

use crate::{app::AppState, errors, template};

pub struct Package {
  pub name: String,
  pub version: String,
  pub description: String,
  pub repository: String,
  pub homepage: String,
  pub license: String,
  pub keywords: Vec<String>,
  pub authors: Vec<String>,
}

// #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct PackageManagerEditorManifest {
//   pub schema_version: u64,
//   pub packages: HashMap<String, PackageManagerEditorManifestPackage>,
//   pub metadata_package_name: String
// }

// #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct PackageManagerEditorManifestPackage {
//   pub is_discoverable: Option<bool>,
//   pub must_be_bundled: Option<bool>,
//   pub version: Option<String>,
//   pub minimum_version: Option<String>,
//   pub deprecated: Option<String>,
//   pub remove_on_project_upgrade: Option<bool>,
//   pub is_file: Option<bool>
// }

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum PackageType {
  Internal,
  Default,
  Git,
  Local
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinimalPackage { 
  pub name: String,
  pub version: String,
  // pub is_file: bool,
  pub is_discoverable: bool,
  pub _type: PackageType
}

// pub fn get_editor_package_manager_manifest(editor_version: String, app_state: &tauri::State<AppState>) -> Result<PackageManagerEditorManifest, errors::AnyError> {
//   let editor = app_state.editors.lock()
//     .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?
//     .iter()
//     .find(|x| x.version == editor_version)
//     .ok_or(errors::str_error("Invalid editor version"))?
//     .clone();

//   let root_path = crate::editor::get_root_folder(editor.exe_path.clone());
//   let manifest_folder_path = crate::editor::get_package_manager_folder(&editor)?;
//   let manifest_folder_path = manifest_folder_path
//     .join("Editor");

//   let manifest_path = manifest_folder_path
//     .join("manifest")
//     .with_extension("json");

//   if !manifest_path.exists() {
//     return Err(errors::io_not_found("Invalid manifest path"));
//   }

//   let manifest_contents = std::fs::read_to_string(&manifest_path)
//     .map_err(|_| errors::io_not_found("Invalid manifest file"))?;

//   let mut manifest: PackageManagerEditorManifest = serde_json::from_str(&manifest_contents)
//     .map_err(|_| errors::io_not_found("Invalid manifest file"))?;

//   let files = std::fs::read_dir(&manifest_folder_path)
//     .map_err(|_| errors::io_not_found("Invalid manifest file"))?
//     .filter_map(|x| x.ok())
//     .filter_map(|x| x.file_name().to_str().map(|x| x.to_string()))
//     .collect::<Vec<_>>();

//   for (key, package) in manifest.packages.iter_mut() {
//     let version = package.version.clone();
//     if let Some(version) = version {
//       package.is_file = Some(files.contains(&format!("{}-{}.tgz", &key, version)));
//     } else {
//       package.is_file = None;
//     }
//   }

//   Ok(manifest)
// }

// commands

// need to override versions with current template versions
#[tauri::command]
pub fn cmd_get_default_editor_packages(editor_version: String, app_state: tauri::State<AppState>) -> Result<Vec<MinimalPackage>, errors::AnyError> {
  let manifest = crate::editor::read_package_manager_manifest(editor_version, &app_state)?;
  let mut manifest_packages = manifest.packages
    .iter()
    // .filter(|x| x.1.is_discoverable == Some(true))
    .map(|x| MinimalPackage {
      name: x.0.clone(),
      version: x.1.version.clone().unwrap_or_default(),
      // is_file: x.1.is_file.unwrap_or(false),
      is_discoverable: x.1.is_discoverable.unwrap_or(false),
      _type: x.1.is_default.unwrap_or(false).then(|| PackageType::Default).unwrap_or(PackageType::Internal)
    })
    .collect::<Vec<_>>();

  manifest_packages.sort_by(|x, y| x.name.cmp(&y.name));
  
  Ok(manifest_packages)
}