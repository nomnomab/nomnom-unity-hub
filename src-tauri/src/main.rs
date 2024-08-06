// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use tauri::Manager;

mod app;
mod editor;
mod errors;
mod prefs;
mod project;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // prefs
            prefs::cmd_get_prefs,
            prefs::cmd_load_prefs,
            prefs::cmd_save_prefs,
            prefs::cmd_set_pref_value,
            // project
            project::cmd_get_default_project_path,
            project::cmd_remove_missing_projects,
            project::cmd_add_project,
            project::cmd_remove_project,
            project::cmd_get_projects,
            project::cmd_get_projects_on_page,
            project::cmd_open_project_in_editor,
            // editors
            editor::cmd_get_editors
        ])
        .setup(|app| {
            let app_handle = app.handle();
            let prefs = app::load_prefs_from_disk(&app_handle)?;
            let projects = app::load_projects_from_disk(&app_handle)?;

            app.manage(app::AppState {
                prefs: Mutex::new(prefs),
                projects: Mutex::new(projects),
                editors: Mutex::new(Vec::new()),
            });

            let app_state = app.state::<app::AppState>();
            let editors = editor::find_editor_installs(&app_state)?;
            (*app_state.editors.lock().unwrap()).clear();
            (*app_state.editors.lock().unwrap()).extend(editors);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}