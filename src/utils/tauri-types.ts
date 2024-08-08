import { LazyValue } from "../utils";

export namespace TauriTypes {
  export interface Project {
    name: string;
    path: string;
    version: string;
  }

  export enum PrefsKey {
    HubPath,
    HubEditorsPath,
    HubAppDataPath,
    NewProjectPath,
  }

  export interface Prefs {
    newProjectPath?: string;
    hubPath?: string;
    hubEditorsPath?: string;
    hubAppdataPath?: string;
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
}

export {};
