import { LazyValue } from "../utils";

export namespace TauriTypes {
  export interface Project {
    name: string;
    path: string;
    version: string;
  }

  export enum PrefsKey {
    HubPath = "HubPath",
    HubEditorsPath = "HubEditorsPath",
    HubAppDataPath = "HubAppDataPath",
    NewProjectPath = "NewProjectPath",
  }

  export interface Prefs {
    newProjectPath?: string;
    hubPath?: string;
    hubEditorsPath?: string;
    hubAppdataPath?: string;
  }

  export interface UserCache {
    lastEditorVersion?: string;
  }

  export enum UserCacheKey {
    LastEditorVersion = "LastEditorVersion",
  }

  export interface UnityEditorInstall {
    exePath: string;
    version: string;
    modules: UnityEditorModule[];

    // extra
    diskSize?: LazyValue<number>;
  }

  export interface UnityEditorModule {
    name: string;
    id: string;
    description: string;
    category: string;
    visible: boolean;
    selected: boolean;
  }

  export interface Page<T> {
    items: T[];
    index: number;
  }

  export interface SurfaceTemplate {
    name: string;
    version: string;
    path: string;
  }

  export interface TgzPackageJson {
    name?: string;
    displayName?: string;
    version?: string;
    type?: string;
    host?: string;
    unity: string;
    description?: string;
    dependencies?: any; // Equivalent to HashMap<String, String> in Rust
    upm?: UPM;
    upmCi?: UpmCi;
    repository?: Repository;
  }

  export interface UPM {
    changelog?: string;
  }

  export interface UpmCi {
    footprint?: string;
  }

  export interface Repository {
    url?: string;
    type?: string;
    revision?: string;
  }

  export interface TgzPackageJsonRecord {
    tgzPackage: TgzPackageJson;
    surfaceTemplate: SurfaceTemplate;
    pipelines: UnityPipeline[];
    diskSizeBytes: number;
  }

  export enum UnityPipeline {
    Unknown,
    BuiltIn,
    URP,
    HDRP,
    Custom,
  }

  export interface MinimalPackage {
    name: string;
    version: string;
    isFile: boolean;
  }

  export interface FilePath {
    parts: string[];
  }

  export interface FileDir {
    id: string;
    name: string;
    children?: FileDir[];
  }

  export function initFileDir(fileDir: FileDir): FileDir {
    if (fileDir.children?.length === 0) {
      fileDir.children = undefined;
    }

    if (!fileDir.children) {
      return fileDir;
    }

    for (let i = 0; i < fileDir.children.length; i++) {
      fileDir.children[i] = initFileDir(fileDir.children[i]);
    }

    return fileDir;
  }

  export interface TemplateInfoForGeneration {
    template?: SurfaceTemplate;
    editorVersion: UnityEditorInstall;
    packages: MinimalPackage[];
    selectedFiles: string[]; // PathBuf is usually represented as a string in TS
  }

  export interface ProjectInfoForGeneration {
    name: string;
    path: string; // PathBuf is usually represented as a string in TS
  }

  export interface NewTemplateInfo {
    template: TemplateInfoForGeneration;
    name: string;
  }
}

export {};
