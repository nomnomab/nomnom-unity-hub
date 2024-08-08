use std::collections::HashMap;

use crate::{app::AppState, errors};

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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageManagerEditorManifest {
  pub schema_version: u64,
  pub packages: HashMap<String, PackageManagerEditorManifestPackage>,
  pub metadata_package_name: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageManagerEditorManifestPackage {
  pub is_discoverable: Option<bool>,
  pub must_be_bundled: Option<bool>,
  pub version: Option<String>,
  pub minimum_version: Option<String>,
  pub deprecated: Option<String>,
  pub remove_on_project_upgrade: Option<bool>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinimalPackage { 
  pub name: String,
  pub version: String,
}

pub fn get_editor_package_manager_manifest(editor_version: String, app_state: &tauri::State<AppState>) -> Result<PackageManagerEditorManifest, errors::AnyError> {
  let editor = app_state.editors.lock()
    .map_err(|_| errors::str_error("Failed to get editors. Is it locked?"))?
    .iter()
    .find(|x| x.version == editor_version)
    .ok_or(errors::str_error("Invalid editor version"))?
    .clone();

  let root_path = crate::editor::get_root_folder(editor.exe_path.clone());
  let manifest_path = root_path
    .ok_or(errors::io_not_found("Invalid editor path"))?
    .join("Editor")
    .join("Data")
    .join("Resources")
    .join("PackageManager")
    .join("Editor")
    .join("manifest")
    .with_extension("json");

  if !manifest_path.exists() {
    return Err(errors::io_not_found("Invalid manifest path"));
  }

  let manifest_contents = std::fs::read_to_string(&manifest_path)
    .map_err(|_| errors::io_not_found("Invalid manifest file"))?;

  let manifest: PackageManagerEditorManifest = serde_json::from_str(&manifest_contents)
    .map_err(|_| errors::io_not_found("Invalid manifest file"))?;

  Ok(manifest)
}

// commands

#[tauri::command]
pub fn cmd_get_default_editor_packages(editor_version: String, app_state: tauri::State<AppState>) -> Result<Vec<MinimalPackage>, errors::AnyError> {
  let manifest = get_editor_package_manager_manifest(editor_version, &app_state)?;
  let mut manifest_packages = manifest.packages
    .iter()
    .filter(|x| x.1.is_discoverable == Some(true))
    .map(|x| MinimalPackage {
      name: x.0.clone(),
      version: x.1.version.clone().unwrap_or_default(),
    })
    .collect::<Vec<_>>();

    manifest_packages.sort_by(|x, y| x.name.cmp(&y.name));
  
  Ok(manifest_packages)
}