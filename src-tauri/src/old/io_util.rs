use std::path::Path;
use std::{io, fs};

pub fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

pub fn get_cache_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    let cache_dir = app.path_resolver().app_cache_dir().unwrap();
    cache_dir
}

pub fn get_cache_appended_dir(app: &tauri::AppHandle, name: &str) -> std::path::PathBuf {
    let cache_dir = app.path_resolver().app_cache_dir().unwrap();
    let cache_path = cache_dir.join(name);

    if cache_path.exists() {
        std::fs::remove_dir_all(&cache_path).unwrap();
    }
    
    std::fs::create_dir_all(&cache_path).unwrap();

    cache_path
}