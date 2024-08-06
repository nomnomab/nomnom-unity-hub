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
}

export {};
