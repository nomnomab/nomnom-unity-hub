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

pub fn dir_size(path: impl Into<std::path::PathBuf>) -> std::io::Result<u64> {
    fn dir_size(mut dir: std::fs::ReadDir) -> std::io::Result<u64> {
        dir.try_fold(0, |acc, file| {
            let file = file?;
            let size = match file.metadata()? {
                data if data.is_dir() => dir_size(std::fs::read_dir(file.path())?)?,
                data => data.len(),
            };
            Ok(acc + size)
        })
    }

    dir_size(std::fs::read_dir(path.into())?)
}

pub fn file_size(path: impl Into<std::path::PathBuf>) -> std::io::Result<u64> {
    let size = std::fs::metadata(path.into())?
        .len();
    Ok(size)
}

// A type to represent a path, split into its component parts
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct FilePath {
    parts: Vec<String>,
}

impl FilePath {
    pub fn new(path: &str) -> FilePath {
        FilePath {
            parts: path.to_string().split("/").map(|s| s.to_string()).collect(),
        }
    }
}

// A recursive type to represent a directory tree.
// Simplification: If it has children, it is considered
// a directory, else considered a file.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct FileDir {
    id: String,
    name: String,
    pub children: Vec<Box<FileDir>>,
}

impl FileDir {
    fn new(name: &str) -> FileDir {
        FileDir {
            id: "0".to_string(),
            name: name.to_string(),
            children: Vec::<Box<FileDir>>::new(),
        }
    }

    fn find_child(&mut self, name: &str) -> Option<&mut FileDir> {
        for c in self.children.iter_mut() {
            if c.name == name {
                return Some(c);
            }
        }
        None
    }

    fn add_child<T>(&mut self, leaf: T) -> &mut Self
    where
        T: Into<FileDir>,
    {
        self.children.push(Box::new(leaf.into()));
        self
    }

    pub fn sort(&mut self) {
        // sort folders first
        self.children
            .sort_by(|a, b| {
                let a_path = std::path::PathBuf::from(&a.name);
                let b_path = std::path::PathBuf::from(&b.name);

                let a_extension = a_path.extension();
                let b_extension = b_path.extension();

                if a_extension.is_some() && b_extension.is_none() { std::cmp::Ordering::Greater }
                else if a_extension.is_none() && b_extension.is_some() { std::cmp::Ordering::Less }
                else { a_path.file_name().unwrap().to_ascii_lowercase().cmp(&b_path.file_name().unwrap().to_ascii_lowercase()) }
            });
        // self.children
        //     .sort_by(|a, b| a.name.cmp(&b.name));
        for c in self.children.iter_mut() {
            c.sort();
        }
    }
}

pub fn dir(val: &str) -> FileDir {
    FileDir::new(val)
}

pub fn build_tree(node: &mut FileDir, parts: &Vec<String>, depth: usize) {
    if depth < parts.len() {
        let item = &parts[depth];

        let mut dir = match node.find_child(&item) {
            Some(d) => d,
            None => {
                let d = FileDir::new(&item);
                node.add_child(d);
                match node.find_child(&item) {
                    Some(d2) => d2,
                    None => panic!("Got here!"),
                }
            }
        };
        build_tree(&mut dir, parts, depth + 1);
    }
}

pub fn build_ids(node: &mut FileDir, id: &mut u64) {
    *id = *id + 1u64;
    node.id = id.to_string();

    for c in node.children.iter_mut() {
        *id = *id + 1u64;
        build_ids(c, id);
    }
}