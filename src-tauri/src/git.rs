use serde::{Deserialize, Serialize};

use crate::errors;

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
pub async fn cmd_get_git_package_json(app: tauri::AppHandle, url: String) -> Result<PackageJson, errors::AnyError> {
    // extract ?path= if it has it
    let mut url = url;
    let mut path = None;
    let mut branch = None;

    if url.contains("#") {
      let split = url.split("#").collect::<Vec<_>>();
      if split.len() > 1 {
        branch = Some(split[1].to_string());
        url = split[0].to_string();
      }
    }
    
    if url.contains("?path=") {
        let split = url
          .split("?path=")
          .collect::<Vec<_>>();

        let test_path = split.get(1)
          .ok_or(errors::str_error("Invalid git url"))?;
        let test_url = split.get(0)
          .ok_or(errors::str_error("Invalid git url"))?;
        
        path = Some(test_path.to_string());
        url = test_url.to_string();
    }

    let cache_dir = app
      .path_resolver()
      .app_cache_dir()
      .ok_or(errors::str_error("Failed to get app cache dir"))?;
    let cache_path = cache_dir.join("temp-git");

    if cache_path.exists() {
        std::fs::remove_dir_all(&cache_path)?;
    }
    
    let cache_path_str = cache_path.to_str()
      .ok_or(errors::str_error("Failed to get app cache dir"))?;
    
    std::fs::create_dir_all(&cache_path)?;

    fn run_clone(args: Vec<&str>) -> bool {
      std::process::Command::new("git")
        .args(args.as_slice())
        .output()
        .inspect(|x| println!("{:?}", x))
        .is_ok_and(|x| x.status.success())
    }

    let clone_success = {
      if let Some(branch) = branch {
        let args = vec!["clone", "-b", &branch, &url, cache_path_str];
        run_clone(args)
      } else {
        let args = vec!["clone", &url, cache_path_str];
        run_clone(args)
      }
    };

    if !clone_success {
        std::fs::remove_dir_all(&cache_path)?;
        return Err(errors::str_error("Failed to clone repository"));
    }

    let package_json = {
      let package_json_path = {
        if let Some(path) = &path {
            cache_path
              .clone()
              .join(path)
        } else {
            cache_path.clone()
        }
      };

      let package_json_path = package_json_path
        .join("package")
        .with_extension("json");

      println!("package_json_path: {}", package_json_path.display());
      
      let contents = std::fs::read_to_string(&package_json_path)
        .map_err(|_| errors::str_error("Failed to read package.json"))?;
      let package_json: PackageJson = serde_json::from_str(&contents)
        .map_err(|_| errors::str_error("Invalid package.json"))?;

      Ok(package_json)
    };

    std::fs::remove_dir_all(&cache_path)?;
    package_json
}