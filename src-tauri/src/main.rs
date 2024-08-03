// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::Context;

mod editors;
mod prefs;
mod templates;
mod graphql;
mod project;
mod io_util;
mod git;

#[tauri::command]
fn get_config_path(app: tauri::AppHandle) -> String {
    let config = app.config();
    let path = prefs::Prefs::get_config_path(&config);
    path.to_str().unwrap().to_string()
}

#[tauri::command]
fn show_path_in_file_manager(path: String) {
  showfile::show_path_in_file_manager(path);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_config_path, 
            show_path_in_file_manager,
            editors::get_editor_installs, 
            editors::get_last_used_editor,
            editors::set_last_used_editor,
            editors::calculate_disk_size,
            editors::calculate_editor_disk_size,
            prefs::get_prefs,
            prefs::save_prefs,
            prefs::get_projects,
            prefs::add_project,
            prefs::remove_project,
            prefs::get_default_project_path,
            prefs::clean_projects,
            prefs::is_first_boot,
            prefs::set_past_first_boot,
            editors::open_project,
            editors::open_editor,
            templates::get_quick_templates,
            templates::load_template,
            templates::generate_template,
            templates::refresh_template_cache,
            templates::delete_custom_template,
            graphql::parse_graphql,
            project::generate_project,
            project::change_project_editor_version,
            project::is_valid_project_root_dir,
            project::is_valid_new_project_root_dir,
            project::is_valid_path,
            project::open_unity_hub,
            git::get_git_package_json,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            
            if let Err(err) = setup(&handle) {
                println!("{:?}", err);
                return Err(err.into());
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup(app: &tauri::AppHandle) -> anyhow::Result<()> {
    prefs::setup(app).context("Failed to read settings")?;
    Ok(())
}