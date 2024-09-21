import { invoke } from "@tauri-apps/api/tauri";
import { TauriTypes } from "./tauri-types";
import { convertFileSrc } from "@tauri-apps/api/tauri";

export namespace TauriRouter {
  // app

  export async function show_path_in_file_manager(path: string): Promise<void> {
    return invoke("cmd_show_path_in_file_manager", { path });
  }

  export async function is_valid_path(path: string): Promise<boolean> {
    return invoke("cmd_is_valid_path", { path });
  }

  export async function is_valid_dir(path: string): Promise<boolean> {
    return invoke("cmd_is_valid_dir", { path });
  }

  export async function is_valid_file(path: string): Promise<boolean> {
    return invoke("cmd_is_valid_file", { path });
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

  export async function set_prefs(prefs: TauriTypes.Prefs): Promise<void> {
    return invoke("cmd_set_prefs", { prefs });
  }

  // user_cache

  export async function get_user_cache(): Promise<TauriTypes.UserCache> {
    return invoke("cmd_get_user_cache");
  }

  export async function save_user_cache(): Promise<void> {
    return invoke("cmd_save_user_cache");
  }

  export async function set_user_cache_value(
    key: TauriTypes.UserCacheKey,
    value: any
  ): Promise<void> {
    return invoke("cmd_set_user_cache_value", { key, value });
  }

  export async function add_git_package_to_cache(
    _package: TauriTypes.MinimalPackage
  ): Promise<void> {
    return invoke("cmd_add_git_package_to_cache", { ["package"]: _package });
  }

  export async function remove_git_package_from_cache(
    _package: TauriTypes.MinimalPackage
  ): Promise<void> {
    return invoke("cmd_remove_git_package_from_cache", {
      ["package"]: _package,
    });
  }

  export async function add_local_package_to_cache(
    _package: TauriTypes.MinimalPackage
  ): Promise<void> {
    return invoke("cmd_add_local_package_to_cache", { ["package"]: _package });
  }

  export async function remove_local_package_from_cache(
    _package: TauriTypes.MinimalPackage
  ): Promise<void> {
    return invoke("cmd_remove_local_package_from_cache", {
      ["package"]: _package,
    });
  }

  export async function delete_template_cache() {
    return invoke("cmd_delete_template_cache");
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
    projectPath: string,
    andOpen?: boolean
  ): Promise<TauriTypes.Project> {
    const andOpenBool = andOpen ? true : false;
    return invoke("cmd_add_project", { projectPath, andOpen: andOpenBool });
  }

  export async function remove_project(projectPath: string): Promise<void> {
    return invoke("cmd_remove_project", { projectPath });
  }

  export async function get_projects(): Promise<TauriTypes.Project[]> {
    return invoke("cmd_get_projects");
  }

  export async function get_projects_on_page(
    page: number,
    perPageCount: number,
    searchOptions: TauriTypes.SearchOptions
  ): Promise<TauriTypes.Project[]> {
    return invoke("cmd_get_projects_on_page", {
      page,
      perPageCount,
      searchOptions,
    });
  }

  export async function open_project_in_editor(
    projectPath: string,
    editorVersion: string
  ): Promise<void> {
    return invoke("cmd_open_project_in_editor", { projectPath, editorVersion });
  }

  export async function change_project_editor_version(
    projectPath: string,
    editorVersion: string
  ): Promise<void> {
    return invoke("cmd_change_project_editor_version", {
      projectPath,
      editorVersion,
    });
  }

  export async function fetch_project_thumbnail(
    projectPath: string
  ): Promise<string> {
    return invoke("cmd_fetch_project_thumbnail", { projectPath }).then(
      (path) => {
        return convertFileSrc(path as string);
      }
    );
  }

  export async function pin_project(projectPath: string): Promise<void> {
    return invoke("cmd_pin_project", { projectPath });
  }

  export async function unpin_project(projectPath: string): Promise<void> {
    return invoke("cmd_unpin_project", { projectPath });
  }

  export async function is_open_in_editor(
    projectPath: string,
    editorVersion: string
  ): Promise<boolean> {
    return invoke("cmd_is_open_in_editor", { projectPath, editorVersion });
  }

  export async function load_project_files_tree(
    projectPath: string
  ): Promise<TauriTypes.FileDir> {
    return invoke("cmd_load_project_files_tree", { projectPath });
  }

  export async function load_project_packages(
    projectPath: string,
    editorVersion: string
  ): Promise<TauriTypes.TgzPackageJson> {
    return invoke("cmd_load_project_packages", { projectPath, editorVersion });
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

  // package

  export async function get_default_editor_packages(
    editorVersion: string
  ): Promise<TauriTypes.MinimalPackage[]> {
    return invoke("cmd_get_default_editor_packages", { editorVersion });
  }

  // template

  export async function get_surface_templates(
    editorVersion: string
  ): Promise<TauriTypes.SurfaceTemplate[]> {
    return invoke("cmd_get_surface_templates", { editorVersion });
  }

  export async function get_template_information(
    surfaceTemplate: TauriTypes.SurfaceTemplate
  ): Promise<TauriTypes.TgzPackageJsonRecord> {
    return invoke("cmd_get_template_information", { surfaceTemplate });
  }

  export async function get_template_file_paths(
    surfaceTemplate: TauriTypes.SurfaceTemplate
  ): Promise<TauriTypes.FileDir> {
    return invoke("cmd_get_template_file_paths", { surfaceTemplate });
  }

  export async function delete_template(
    surfaceTemplate: TauriTypes.SurfaceTemplate,
    editorVersion: string
  ): Promise<void> {
    return invoke("cmd_delete_template", { surfaceTemplate, editorVersion });
  }

  // generate

  export async function generate_project(
    projectInfo: TauriTypes.ProjectInfoForGeneration,
    templateInfo: TauriTypes.TemplateInfoForGeneration
  ): Promise<string> {
    return invoke("cmd_generate_project", { projectInfo, templateInfo });
  }

  export async function generate_template(
    templateInfo: TauriTypes.NewTemplateInfo
  ): Promise<string> {
    return invoke("cmd_generate_template", { templateInfo });
  }

  export async function generate_template_from_project(
    templateInfo: TauriTypes.ProjectTemplateInfoForGeneration,
    newTemplateInfo: TauriTypes.NewTemplateInfo
  ): Promise<string> {
    return invoke("cmd_generate_template_from_project", {
      templateInfo,
      newTemplateInfo,
    });
  }

  // git

  export async function get_git_package_json(
    url: string
  ): Promise<TauriTypes.PackageJson> {
    return invoke("cmd_get_git_package_json", { url });
  }

  // other

  export async function open_unity_hub(): Promise<void> {
    return invoke("cmd_open_unity_hub");
  }
}

export {};
