// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]
#![allow(
    unused,
    unused_imports,
    unused_allocation,
    unused_assignments,
    unused_results,
    unused_variables
)]

use std::sync::Mutex;

use tauri::Manager;

mod app;
mod cache;
mod editor;
mod errors;
mod generate;
mod git;
mod io_utils;
mod package;
mod prefs;
mod project;
mod template;

#[derive(Clone, serde::Serialize)]
struct Payload {
  args: Vec<String>,
  cwd: String,
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      app::cmd_show_path_in_file_manager,
      app::cmd_is_valid_path,
      app::cmd_is_valid_dir,
      app::cmd_is_valid_file,
      // prefs
      prefs::cmd_get_prefs,
      prefs::cmd_load_prefs,
      prefs::cmd_save_prefs,
      prefs::cmd_set_pref_value,
      prefs::cmd_set_prefs,
      // user_cache
      cache::cmd_get_user_cache,
      cache::cmd_save_user_cache,
      cache::cmd_set_user_cache_value,
      cache::cmd_add_git_package_to_cache,
      cache::cmd_add_local_package_to_cache,
      cache::cmd_remove_git_package_from_cache,
      cache::cmd_remove_local_package_from_cache,
      cache::cmd_delete_template_cache,
      // project
      project::cmd_get_default_project_path,
      project::cmd_remove_missing_projects,
      project::cmd_add_project,
      project::cmd_remove_project,
      project::cmd_get_projects,
      project::cmd_get_projects_on_page,
      project::cmd_open_project_in_editor,
      project::cmd_change_project_editor_version,
      project::cmd_fetch_project_thumbnail,
      project::cmd_pin_project,
      project::cmd_unpin_project,
      project::cmd_is_open_in_editor,
      project::cmd_load_project_files_tree,
      project::cmd_load_project_packages,
      // editors
      editor::cmd_get_editors,
      editor::cmd_open_unity_hub,
      editor::cmd_estimate_editor_size,
      // packages
      package::cmd_get_default_editor_packages,
      // templates
      template::cmd_get_surface_templates,
      template::cmd_get_template_information,
      template::cmd_get_template_file_paths,
      template::cmd_delete_template,
      // generate
      generate::cmd_generate_project,
      generate::cmd_generate_template,
      generate::cmd_generate_template_from_project,
      // git
      git::cmd_get_git_package_json
    ])
    .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
      println!("{}, {argv:?}, {cwd}", app.package_info().name);
      app.emit_all("single-instance", Payload { args: argv, cwd })
        .unwrap();
    }))
    .setup(|app| {
      let app_handle = app.handle();
      let prefs = app::load_prefs_from_disk(&app_handle)?;
      let user_cache = app::load_user_cache_from_disk(&app_handle)?;
      let projects = app::load_projects_from_disk(&app_handle)?;

      app.manage(app::AppState {
        prefs: Mutex::new(prefs),
        user_cache: Mutex::new(user_cache),
        projects: Mutex::new(projects),
        editors: Mutex::new(Vec::new()),
      });

      let app_state = app.state::<app::AppState>();
      match editor::find_editor_installs(&app_state) {
        Ok(editors) => {
          (*app_state.editors.lock().unwrap()).clear();
          (*app_state.editors.lock().unwrap()).extend(editors);
        }
        Err(err) => {
          println!("{}", err);
        }
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
