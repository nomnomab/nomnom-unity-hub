use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct PackageJson {
    name: String,
    version: String,
}

impl Default for PackageJson {
    fn default() -> Self {
        Self {
            name: "nomnom-unity-hub".to_string(),
            version: "0.0.0".to_string(),
        }
    }
}

#[tauri::command]
pub async fn get_git_package_json(app: tauri::AppHandle, url: String) -> Result<PackageJson, String> {
    // extract ?path= if it has it
    let mut url = url;
    let mut path = None;
    if url.contains("?path=") {
        let split = url.split("?path=").collect::<Vec<_>>();
        path = Some(split[1].to_string());
        url = split[0].to_string();
    }

    let cache_dir = app.path_resolver().app_cache_dir().unwrap();
    let cache_path = cache_dir.join("temp-git");

    if cache_path.exists() {
        std::fs::remove_dir_all(&cache_path).unwrap();
    }
    
    std::fs::create_dir_all(&cache_path).unwrap();

    let clone_result = std::process::Command::new("git")
        .arg("clone")
        .arg(url)
        .arg(cache_path.to_str().unwrap())
        .output();

    if clone_result.is_err() {
        return Err("Failed to clone repository".to_string());
    }

    // let mut package_json_path = cache_path;
    // if let Some(path) = path {
    //     package_json_path = package_json_path.join(&path);
    // }

    let package_json_path = {
        if let Some(path) = &path {
            cache_path.clone().join(path)
        } else {
            cache_path.clone()
        }
    };

    let package_json_path = package_json_path.join("package.json");
    let contents = std::fs::read_to_string(&package_json_path).unwrap();
    let package_json: PackageJson = serde_json::from_str(&contents).unwrap();

    if cache_path.exists() {
        std::fs::remove_dir_all(&cache_path).unwrap();
    }

    Ok(package_json)
}