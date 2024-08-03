use std::{collections::HashMap, fs::File, io::{Read, Write}, path::PathBuf, process::Command, str::FromStr};

use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use serde::{Deserialize, Serialize};

use crate::{editors::{self, get_editor_installs}, io_util::{self, get_cache_appended_dir, get_cache_dir}, prefs};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct MinimalTemplate {
    pub path: Option<PathBuf>,
    pub display_name: String,
    pub id: String,
    pub version: String,
    pub editor_version: String,
    pub is_custom: Option<bool>,
}

impl Default for MinimalTemplate {
    fn default() -> Self {
        Self { 
            path: None, 
            display_name: String::new(), 
            id: String::new(),
            version: String::new(), 
            editor_version: String::new(),
            is_custom: Some(false) 
        }
    }
}

impl MinimalTemplate {
    pub fn get_name(&self) -> String {
        format!("{}-{}", self.id, self.version).to_string()
    }    
}

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

impl Template {
    pub fn get_name(&self) -> String {
        format!("{}-{}", self.name, self.version).to_string()
    }
 }

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
    let path = template_header.clone().path.unwrap();

    // check if exists in cache already
    let cache_dir = app.path_resolver().app_cache_dir().unwrap();
    let cache_path = cache_dir.join("templates").join(template_header.get_name());
    let cache_json_path = cache_path.join("package.json");

    let mut contents = None;
    if cache_json_path.exists() {
        println!("{:?} exists", cache_json_path);
        contents = Some(std::fs::read_to_string(&cache_json_path).unwrap());
    } else {
        println!("{:?} does not exist", cache_json_path);
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
        template.path = Some(path.clone());
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
    let editors = get_editor_installs(app.clone()).unwrap();
    let editor = editors.iter().find(|x| x.version == editor_version).unwrap();
    let path = std::path::PathBuf::from(&editor.path);
    let path = path.parent().unwrap();
    let editor_path = path.join("Data").join("Resources").join("PackageManager").join("ProjectTemplates");

    let hub_path = editors::get_hub_templates_path(&app);
    let custom_manifest_path = hub_path.join("custom_manifest.json");
    if !custom_manifest_path.exists() {
        let new_manifest = serde_json::json!({
            "templates": []
        });
        std::fs::write(&custom_manifest_path, serde_json::to_string_pretty(&new_manifest).unwrap()).unwrap();
    }

    let custom_manifest = std::fs::read_to_string(&custom_manifest_path).unwrap();
    let custom_manifest: serde_json::Value = serde_json::from_str(&custom_manifest).unwrap();
    let custom_templates = custom_manifest["templates"].as_array().unwrap().iter()
        .map(|x| x.as_str().unwrap())
        .collect::<Vec<_>>();

    let mut templates = Vec::new();

    if editor_path.exists() {
        let files = editor_path.read_dir().unwrap();
        let tgz_files = files
            .filter_map(|x| x.ok())
            .filter(|x| x.file_name().to_str().unwrap().ends_with(".tgz"))
            .collect::<Vec<_>>();

        let found = tgz_files.iter().map(|x| {
            // extract info
            let name = x.file_name().to_str().unwrap().to_string();
            let last_index_dash = name.rfind('-').unwrap();
            let split = name.split_at(last_index_dash);
            let id = split.0.to_string();
            let version = split.1[1..(split.1.len() - 4)].to_string();

            // remove extension from name
            let name = std::path::Path::new(&name).file_stem().unwrap().to_str().unwrap().to_string();
            let is_custom = custom_templates.iter().any(|x| x == &name);
            let is_custom = if is_custom { Some(true) } else { None };

            MinimalTemplate { 
                path: Some(x.path().to_path_buf()),
                display_name: id.clone(),
                id,
                version,
                editor_version: editor_version.clone(),
                is_custom
            }
        }).collect::<Vec<_>>();

        templates.extend(found);
    }

    let installed_templates_manifest_path = hub_path.join("manifest.json");
    
    if installed_templates_manifest_path.exists() {
        let installed_templates_manifest_content = &std::fs::read_to_string(&installed_templates_manifest_path).unwrap();
        let installed_templates: HashMap<String, serde_json::Value> = serde_json::from_str(installed_templates_manifest_content).unwrap();

        // version: {
        //    dependencies: {
        //      name: version
        //    }
        // }
        for (_, value) in installed_templates.iter().filter(|x| x.0 == &editor_version) {
            let dependencies = value["dependencies"].as_object().unwrap();
            for (name, version) in dependencies {
                let name_string = name.as_str().to_string();
                let version_string = version.as_str().unwrap().to_string();
                let combined_string = format!("{}-{}", name_string, version_string);
                let is_custom = custom_templates.iter().any(|x| x == &combined_string);
                let is_custom = if is_custom { Some(true) } else { None };
                
                let template = MinimalTemplate { 
                    path: Some(hub_path.join(format!("{}.tgz", combined_string))),
                    // name: combined_string,
                    display_name: name_string.clone(),
                    id: name_string.clone(),
                    version: version_string,
                    editor_version: editor_version.clone(),
                    is_custom
                };

                templates.push(template);
            }
        }
    }

    // templates.sort_by(|a, b| a.name.cmp(&b.name));
    
    templates
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
struct PackageJson {
	dependencies: HashMap<String, String>,
	description: String,
	display_name: String,
	host: String,
	name: String,
    #[serde(rename = "type")]
	type_: String,
	unity: String,
	version: String,
}

impl Default for PackageJson {
    fn default() -> Self {
        Self {
            dependencies: HashMap::new(),
            description: String::new(),
            display_name: String::new(),
            host: String::new(),
            name: String::new(),
            type_: String::new(),
            unity: String::new(),
            version: String::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct Package {
    json: PackageJson,
    project_path: Option<String>,
}

impl Default for Package {
    fn default() -> Self {
        Self { json: PackageJson::default(), project_path: None }
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
pub async fn generate_template(app: tauri::AppHandle, package: Package) {
    let editors = get_editor_installs(app.clone()).unwrap();
    let editor = editors.iter().find(|x| x.version == package.json.unity).unwrap();

    // need to generate a template tgz file and place inside of the editor dir
    // <name.tgz>/package/
    // - ProjectData~
    //   - Assets
    //   - Library (?)
    //   - Packages
    //   - ProjectSettings
    // - package.json~

    let project_path = package.project_path;
    let package_path = get_cache_appended_dir(&app, "package");
    let cache_dir = get_cache_appended_dir(&app, "ProjectData~");

    if let None = project_path {
        // need to make an empty project then
        let exe_path = &editor.path;

        println!("making empty project at: {:?}", cache_dir);

        Command::new(&exe_path)
            .arg("-createProject")
            .arg(cache_dir.to_str().unwrap().to_string())
            .arg("-quit")
            .output()
            .unwrap();

        // copy to package_path
        io_util::copy_dir_all(&cache_dir, &package_path.join("ProjectData~")).unwrap();

        // clean up
        // std::fs::remove_dir_all(&cache_dir).unwrap();
    } else if let Some(project_path) = project_path {
        io_util::copy_dir_all(&project_path, &package_path.join("ProjectData~")).unwrap();
    }

    println!("writing package.json to: {:?}", package_path);

    // write package.json
    let package_json_path = package_path.join("package.json");
    let json = serde_json::to_string_pretty(&package.json).unwrap();
    std::fs::write(&package_json_path, json).unwrap();

    // also need to change the dependencies in Packages/manifest.json
    let package_json_path = package_path.join("ProjectData~").join("Packages").join("manifest.json");
    let manifest_json = std::fs::read_to_string(&package_json_path).unwrap();
    
    let mut manifest = serde_json::from_str::<ManifestStub>(&manifest_json).unwrap();
    manifest.dependencies.clear();
    manifest.dependencies = package.json.dependencies;

    let manifest_json = serde_json::to_string_pretty(&manifest).unwrap();
    std::fs::write(&package_json_path, manifest_json).unwrap();

    let tar_name = format!("{}-{}.tgz", package.json.name, package.json.version);
    let tar_path = get_cache_dir(&app).join(&tar_name);
    if tar_path.exists() {
        std::fs::remove_file(&tar_path).unwrap();
    }

    println!("creating tarball to: {:?}", tar_path);

    // remove folders from project data in package
    let package_project_data = package_path.join("ProjectData~");
    let folders_to_keep = vec!["Assets", /*"Library",*/ "Packages", "ProjectSettings"];
    for entry in std::fs::read_dir(&package_project_data).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if !path.is_dir() {
            std::fs::remove_file(&path).unwrap();
            continue;
        }

        if !folders_to_keep.contains(&path.file_name().unwrap().to_str().unwrap()) {
            std::fs::remove_dir_all(&path).unwrap();
        }
    }

    // remove Packages/packages-lock.json
    let package_lock_path = package_project_data.join("Packages").join("packages-lock.json");
    if package_lock_path.exists() {
        std::fs::remove_file(&package_lock_path).unwrap();
    }
    
    let tar_gz = File::create(&tar_path).unwrap();
    let enc = GzEncoder::new(tar_gz, Compression::default());
    let mut tar = tar::Builder::new(enc);
    tar.append_dir_all("package", &package_path).unwrap();
    // tar.finish().unwrap();
    tar.into_inner().unwrap().finish().unwrap();

    // copy to template folder
    let template_folder = editors::get_hub_templates_path(&app);
    let new_template_path = template_folder.join(&tar_name);
    println!("copying tarball from: {:?} to: {:?}", tar_path, new_template_path);
    std::fs::copy(&tar_path, &new_template_path).unwrap();
    std::fs::remove_file(&tar_path).unwrap();

    std::fs::remove_dir_all(&package_path).unwrap();
    std::fs::remove_dir_all(&cache_dir).unwrap();

    // write to the hub templates manifest.json
    let hub_manifest_path = template_folder.join("manifest.json");
    println!("updating hub manifest at: {:?}", hub_manifest_path);
    
    let mut contents = "{}".to_string();
    if hub_manifest_path.exists() {
        contents = std::fs::read_to_string(&hub_manifest_path).unwrap();
    }

    let mut manifest: HashMap<String, serde_json::Value> = serde_json::from_str(&contents).unwrap();

    // insert version if it doesn't exist
    if !manifest.contains_key(&editor.version) {
        manifest.insert(editor.version.clone(), serde_json::json!({}));
    }

    // insert package if it doesn't exist
    let version_obj = manifest.get_mut(&editor.version).unwrap().as_object_mut().unwrap();
    if !version_obj.contains_key("dependencies") {
        version_obj.insert("dependencies".to_string(), serde_json::json!({}));
    }
    
    let depdencies = version_obj.get_mut("dependencies").unwrap().as_object_mut().unwrap();
    depdencies.insert(package.json.name.clone(), serde_json::Value::String(package.json.version.clone()));

    contents = serde_json::to_string_pretty(&manifest).unwrap();
    std::fs::write(&hub_manifest_path, contents).unwrap();

    // insert into custom manifest
    let custom_manifest_path = template_folder.join("custom_manifest.json");
    if !custom_manifest_path.exists() {
        let new_manifest = serde_json::json!({
            "templates": []
        });
        std::fs::write(&custom_manifest_path, serde_json::to_string_pretty(&new_manifest).unwrap()).unwrap();
    }

    let custom_manifest = std::fs::read_to_string(&custom_manifest_path).unwrap();
    let mut custom_manifest: serde_json::Value = serde_json::from_str(&custom_manifest).unwrap();
    let templates = custom_manifest["templates"].as_array_mut().unwrap();
    let name_version = serde_json::Value::String(format!("{}-{}", package.json.name.clone(), package.json.version.clone()));
    if !templates.contains(&name_version) {
        templates.push(name_version);
    }
    contents = serde_json::to_string_pretty(&custom_manifest).unwrap();
    std::fs::write(&custom_manifest_path, contents).unwrap();
}

#[tauri::command]
pub async fn refresh_template_cache(app: tauri::AppHandle) {
    let cache_dir = app.path_resolver().app_cache_dir().unwrap().join("templates");
    if !cache_dir.exists() {
        return;
    }

    let folders = std::fs::read_dir(&cache_dir).unwrap();
    let editors = get_editor_installs(app.clone()).unwrap();
    
    // find folders that are not in editor template names
    for folder in folders {
        let folder = folder.unwrap();
        let path = folder.path();
        if !path.is_dir() {
            continue;
        }
        let name = path.file_name().unwrap().to_str().unwrap();
        let mut found = false;

        for editor in &editors {
            let templates = get_quick_templates(app.clone(), editor.version.clone());
            for template in templates {
                let template_id = template.get_name();
                if template_id == name {
                    found = true;
                    break;
                }
            }
        }

        if !found {
            println!("removing {:?}", path);
            std::fs::remove_dir_all(&path).unwrap();
        }
    }
}

#[tauri::command]
pub fn delete_custom_template(app: tauri::AppHandle, header: MinimalTemplate) {
    let hub_path = editors::get_hub_templates_path(&app);
    // need to remove from custom_manifest
    let custom_manifest_path = hub_path.join("custom_manifest.json");
    let custom_manifest = std::fs::read_to_string(&custom_manifest_path).unwrap();
    let mut custom_manifest: serde_json::Value = serde_json::from_str(&custom_manifest).unwrap();
    let templates = custom_manifest["templates"].as_array_mut().unwrap();

    let header_name = header.get_name();
    let index = templates.iter().position(|x| x.as_str().unwrap() == header_name);
    if let Some(index) = index {
        templates.remove(index);    
        let contents = serde_json::to_string_pretty(&custom_manifest).unwrap();
        std::fs::write(&custom_manifest_path, contents).unwrap();
    } else {
        println!("template not found: {:?}", header_name);
    }

    // need to remove tgz file from hub templates
    let tgz_file = hub_path.join(format!("{}.tgz", header_name));
    if tgz_file.exists() {
        std::fs::remove_file(tgz_file).unwrap();
    } else {
        println!("tgz not found: {:?}", tgz_file);
    }
    
    // need to remove from manifest dependencies
    let manifest_path = hub_path.join("manifest.json");
    let manifest = std::fs::read_to_string(&manifest_path).unwrap();
    let mut manifest: HashMap<String, serde_json::Value> = serde_json::from_str(&manifest).unwrap();
    
    // insert version if it doesn't exist
    let editor_version = header.editor_version;
    if !manifest.contains_key(&editor_version) {
        manifest.insert(editor_version.clone(), serde_json::json!({}));
    }

    // insert package if it doesn't exist
    let version_obj = manifest.get_mut(&editor_version).unwrap().as_object_mut().unwrap();
    if !version_obj.contains_key("dependencies") {
        version_obj.insert("dependencies".to_string(), serde_json::json!({}));
    }
    
    let depdencies = version_obj.get_mut("dependencies").unwrap().as_object_mut().unwrap();
    if let Some(_) = depdencies.remove(&header.id) {
        let contents = serde_json::to_string_pretty(&manifest).unwrap();
        std::fs::write(&manifest_path, contents).unwrap();
    } else {
        println!("package not found: {:?}", header.id);
    }
    
    // fun
}