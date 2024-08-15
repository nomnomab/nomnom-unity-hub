use std::path::Path;
use std::{io, fs};

use crate::errors;
use filesize::PathExt;

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

pub fn get_cache_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, errors::AnyError> {
    let cache_dir = app.path_resolver().app_cache_dir()
        .ok_or(errors::str_error("Failed to get cache dir"))?;
      
    // if cache_dir.exists() {
    //     std::fs::remove_dir_all(&cache_dir)?;
    // }
    
    std::fs::create_dir_all(&cache_dir)?;
    Ok(cache_dir)
}

pub fn get_cache_appended_dir(app: &tauri::AppHandle, name: &str) -> Result<std::path::PathBuf, errors::AnyError> {
    let cache_dir = get_cache_dir(app)?;
    let cache_path = cache_dir.join(name);

    if cache_path.exists() {
        std::fs::remove_dir_all(&cache_path)?;
    }
    
    std::fs::create_dir_all(&cache_path)?;

    Ok(cache_path)
}

pub fn dir_size(path: impl Into<std::path::PathBuf>) -> Result<u64, errors::AnyError> {
    let path: std::path::PathBuf = path.into();

    fn dir_size(mut dir: std::fs::ReadDir) -> std::io::Result<u64> {
        dir.try_fold(0, |acc, file| {
            let file = file?;
            // println!("{}: {}", file.path().display(), file.metadata()?.len());
            let size = match file.metadata()? {
                data if data.is_dir() => dir_size(std::fs::read_dir(file.path())?)?,
                data => data.len(),
            };
            Ok(acc + size)
        })
    }

    let next_path = std::fs::read_dir(path)?;
    let size = dir_size(next_path)?;
    
    Ok(size)
}

pub fn file_size(path: impl Into<std::path::PathBuf>) -> Result<u64, errors::AnyError> {
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

                let a_is_file = a_path.extension().is_some() || a.name.starts_with(".");
                let b_is_file = b_path.extension().is_some() || b.name.starts_with(".");

                if a_is_file && !b_is_file { std::cmp::Ordering::Greater }
                else if !a_is_file && b_is_file { std::cmp::Ordering::Less }
                // just ignore the unwraps, they should be fine
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

/// Construct a relative path from a provided base directory path to the provided path
///
/// ```rust
/// use pathdiff::diff_paths;
/// use std::path::*;
///
/// let baz: PathBuf = "/foo/bar/baz".into();
/// let bar: PathBuf = "/foo/bar".into();
/// let quux: PathBuf = "/foo/bar/quux".into();
/// assert_eq!(diff_paths(&bar, &baz), Some("../".into()));
/// assert_eq!(diff_paths(&baz, &bar), Some("baz".into()));
/// assert_eq!(diff_paths(&quux, &baz), Some("../quux".into()));
/// assert_eq!(diff_paths(&baz, &quux), Some("../baz".into()));
/// assert_eq!(diff_paths(&bar, &quux), Some("../".into()));
///
/// ```
/// Under MIT LICENSE
pub fn diff_paths(path: &Path, base: &Path) -> Option<std::path::PathBuf> {
    // This routine is adapted from the *old* Path's `path_relative_from`
    // function, which works differently from the new `relative_from` function.
    // In particular, this handles the case on unix where both paths are
    // absolute but with only the root as the common directory.
    use std::path::Component;

    if path.is_absolute() != base.is_absolute() {
        if path.is_absolute() {
            Some(std::path::PathBuf::from(path))
        } else {
            None
        }
    } else {
        let mut ita = path.components();
        let mut itb = base.components();
        let mut comps: Vec<Component> = vec![];
        loop {
            match (ita.next(), itb.next()) {
                (None, None) => break,
                (Some(a), None) => {
                    comps.push(a);
                    comps.extend(ita.by_ref());
                    break;
                }
                (None, _) => comps.push(Component::ParentDir),
                (Some(a), Some(b)) if comps.is_empty() && a == b => (),
                (Some(a), Some(b)) if b == Component::CurDir => comps.push(a),
                (Some(_), Some(b)) if b == Component::ParentDir => return None,
                (Some(a), Some(_)) => {
                    comps.push(Component::ParentDir);
                    for _ in itb {
                        comps.push(Component::ParentDir);
                    }
                    comps.push(a);
                    comps.extend(ita.by_ref());
                    break;
                }
            }
        }
        Some(comps.iter().map(|c| c.as_os_str()).collect())
    }
}