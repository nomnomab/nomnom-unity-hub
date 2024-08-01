use std::{collections::HashMap, io::Read, path::PathBuf};

use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};

use crate::{editors::get_editor_installs, prefs};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct MinimalTemplate {
    pub path: Option<PathBuf>,
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub editor_version: String,
}

impl Default for MinimalTemplate {
    fn default() -> Self {
        Self { path: None, name: String::new(), display_name: String::new(), version: String::new(), editor_version: String::new() }
    }
}

impl MinimalTemplate { }

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct Template {
    pub path: Option<PathBuf>,
    pub name: String,
    pub display_name: String,
    pub version: String,
    pub editor_version: String,
    pub description: String,
    pub dependencies: HashMap<String, String>,
}

impl Default for Template {
    fn default() -> Self {
        Self { 
            path: None, 
            name: String::new(), 
            display_name: String::new(), 
            version: String::new(),
            editor_version: String::new(),
            description: String::new(), 
            dependencies: HashMap::new() 
        }
    }
}

impl Template { }

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct Dependency {
    pub name: String,
    pub version: String,
}

impl Default for Dependency {
    fn default() -> Self {
        Self { name: String::new(), version: String::new() }
    }
}

impl Dependency { }

#[tauri::command]
pub async fn load_template(app: tauri::AppHandle, template_header: MinimalTemplate) -> Template {
    let template = extract_template(app, template_header).unwrap();
    template
}

fn extract_template(app: tauri::AppHandle, template_header: MinimalTemplate) -> anyhow::Result<Template> {
    let path = template_header.path.unwrap();

    // check if exists in cache already
    let cache_dir = app.path_resolver().app_cache_dir().unwrap();
    let cache_path = cache_dir.join("templates").join(&template_header.name);
    let cache_json_path = cache_path.join("package.json");

    let mut contents = None;
    if cache_json_path.exists() {
        println!("{} exists", cache_json_path.display());
        contents = Some(std::fs::read_to_string(&cache_json_path).unwrap());
    } else {
        println!("{} does not exist", cache_json_path.display());
        let tar_gz = std::fs::File::open(&path).unwrap();
        let tar = GzDecoder::new(tar_gz);
        let mut ar = tar::Archive::new(tar);

        // load package json string from tar
        let package_path = std::path::Path::new("package/package.json");
        for mut file in ar.entries().unwrap().filter_map(|x| x.ok()) {
            let name = file.path().unwrap();
            if &*name != package_path {
                continue;
            }

            let mut new_contents = String::new();
            file.read_to_string(&mut new_contents).unwrap();
            contents = Some(new_contents);
            break;
        }
    }

    // parse package json
    if let Some(contents) = contents {
        // let mut template = Template::default();
        let mut template: Template = serde_json::from_str(&contents).unwrap();
        template.path = Some(path);
        template.editor_version = template_header.editor_version;

        // let map: HashMap<String, serde_json::Value> = serde_json::from_str(&contents).unwrap();
    
        // template.name = map.get("name").unwrap().as_str().unwrap().to_string();
        // template.display_name = map.get("displayName").unwrap().as_str().unwrap().to_string();
        // template.version = map.get("version").unwrap().as_str().unwrap().to_string();
        // template.description = map.get("description").unwrap().as_str().unwrap().to_string();
        // // template.dependencies = map.get("dependencies").unwrap().as_object().unwrap().keys().map(|x| x.to_string()).collect::<Vec<_>>();
        // template.dependencies = map.get("dependencies").unwrap().as_object().unwrap().

        // save package json to cache directory
        
        std::fs::create_dir_all(&cache_path).unwrap();
        std::fs::write(cache_json_path, contents).unwrap();

        return Ok(template);
    }

    Err(anyhow::anyhow!("Failed to extract template"))
}

#[tauri::command]
pub fn get_quick_templates(app: tauri::AppHandle, editor_version: String) -> Vec<MinimalTemplate> {
    let editors = get_editor_installs(app).unwrap();
    let editor = editors.iter().find(|x| x.version == editor_version).unwrap();
    let path = std::path::PathBuf::from(&editor.path);
    let path = path.parent().unwrap();
    let path = path.join("Data").join("Resources").join("PackageManager").join("ProjectTemplates");

    if path.exists() {
        let files = path.read_dir().unwrap();
        let tgz_files = files
            .filter_map(|x| x.ok())
            .filter(|x| x.file_name().to_str().unwrap().ends_with(".tgz"))
            .collect::<Vec<_>>();

        return tgz_files.iter().map(|x| {
            // extract info
            let name = x.file_name().to_str().unwrap().to_string();
            let last_index_dash = name.rfind('-').unwrap();
            let split = name.split_at(last_index_dash);
            let id = split.0.to_string();
            let version = split.1[1..(split.1.len() - 4)].to_string();

            // map name to better name
            // let name = match id.as_str() {
            //     "com.unity.template.2d" => "Built-In 2D",
            //     "com.unity.template.3d" => "Built-In 3D",
            //     "com.unity.template.universal-2d" => "URP 2D",
            //     "com.unity.template.universal-3d" => "URP 3D",
            //     _ => id.as_str()
            // };

            // remove extension from name
            let name = std::path::Path::new(&name).file_stem().unwrap().to_str().unwrap().to_string();

            MinimalTemplate { 
                path: Some(x.path().to_path_buf()),
                name,
                display_name: id,
                version,
                editor_version: editor_version.clone()
            }
        }).collect::<Vec<_>>();
    }
    
    Vec::new()
}