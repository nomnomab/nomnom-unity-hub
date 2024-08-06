import { invoke } from "@tauri-apps/api/tauri";
import { TauriTypes } from "./tauri-types";

export namespace TauriRouter {
  // app
  export async function show_path_in_file_manager(path: string): Promise<void> {
    return invoke("cmd_show_path_in_file_manager", { path });
  }

  // prefs
  export async function get_prefs(): Promise<TauriTypes.Prefs> {
    return invoke("cmd_get_prefs");
  }

  export async function load_prefs(): Promise<void> {
    return invoke("cmd_load_prefs");
  }

  export async function save_prefs(): Promise<void> {
    return invoke("cmd_save_prefs");
  }

  export async function set_pref_value(
    key: TauriTypes.PrefsKey,
    value: any
  ): Promise<void> {
    return invoke("cmd_set_pref_value", { key, value });
  }

  // project
  export async function get_default_project_path(): Promise<string> {
    return invoke("cmd_get_default_project_path");
  }

  export async function remove_missing_projects(): Promise<
    TauriTypes.Project[]
  > {
    return invoke("cmd_remove_missing_projects");
  }

  export async function add_project(
    projectPath: string
  ): Promise<TauriTypes.Project> {
    return invoke("cmd_add_project", { projectPath });
  }

  export async function remove_project(projectPath: string): Promise<void> {
    return invoke("cmd_remove_project", { projectPath });
  }

  export async function get_projects(): Promise<TauriTypes.Project[]> {
    return invoke("cmd_get_projects");
  }

  export async function get_projects_on_page(
    page: number,
    perPageCount: number
  ): Promise<TauriTypes.Project[]> {
    return invoke("cmd_get_projects_on_page", { page, perPageCount });
  }

  export async function open_project_in_editor(
    projectPath: string,
    editorVersion: string
  ): Promise<void> {
    return invoke("cmd_open_project_in_editor", { projectPath, editorVersion });
  }

  // editor

  export async function get_editors(): Promise<
    TauriTypes.UnityEditorInstall[]
  > {
    return invoke("cmd_get_editors");
  }

  export async function estimate_editor_size(
    editorVersion: string
  ): Promise<number> {
    return invoke("cmd_estimate_editor_size", { editorVersion });
  }

  // other
  export async function open_unity_hub(): Promise<void> {
    return invoke("cmd_open_unity_hub");
  }
}

export {};
