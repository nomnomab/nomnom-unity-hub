import { createContext, useContext, useEffect, useReducer } from "react";
import { TauriTypes } from "../utils/tauri-types";
import { getAllFileDirIds, LazyVoid } from "../utils";
import { GlobalContext } from "./global-context";
import useBetterState from "../hooks/useBetterState";
import LoadingSpinner from "../components/svg/loading-spinner";
import { routeErrorToToast } from "../utils/toast-utils";
import { TauriRouter } from "../utils/tauri-router";

export namespace NewProjectContext {
  interface Type {
    state: State;
    dispatch: React.Dispatch<Action>;
  }

  type TabName = "template" | "package" | "files" | "info" | "new-template";
  const TabNameArray = ["template", "package", "files", "info"];

  export const getTabIndex = (tab: TabName): number => {
    if (tab === "new-template") {
      return TabNameArray.length;
    }
    return TabNameArray.indexOf(tab);
  };

  export const getTabsLength = (): number => {
    return TabNameArray.length;
  };

  export const getPreviousTab = (tab: TabName): TabName | null => {
    const index = getTabIndex(tab);
    if (index === 0) {
      return null;
    }

    return TabNameArray[index - 1] as TabName;
  };

  export const getNextTab = (tab: TabName): TabName | null => {
    const index = getTabIndex(tab);
    if (index === TabNameArray.length - 1) {
      return null;
    }

    return TabNameArray[index + 1] as TabName;
  };

  export const onFirstTab = (tab: TabName): boolean => {
    return getTabIndex(tab) === 0;
  };

  export const onLastTab = (tab: TabName): boolean => {
    return getTabIndex(tab) === TabNameArray.length - 1;
  };

  interface State {
    tab: TabName;
    initialTemplateInfo: InitialTemplateInfo;
    packageInfo: PackageInfo;
    filesInfo: FilesInfo;
    basicInfo: BasicInfo;
    newTemplateInfo: NewTemplateInfo;
    error: LazyVoid;
  }

  interface BasicInfo {
    name: string;
    path: string;
  }

  interface InitialTemplateInfo {
    selectedTemplate?: TauriTypes.SurfaceTemplate;
    editorVersion: TauriTypes.UnityEditorInstall;
  }

  interface PackageInfo {
    gitPackages: TauriTypes.MinimalPackage[];
    localPackages: TauriTypes.MinimalPackage[];
    templatePackages: TauriTypes.MinimalPackage[];
    selectedPackages: SelectedPackage[];
  }

  interface SelectedPackage {
    name: string;
    version?: string;
  }

  interface FilesInfo {
    root: TauriTypes.FileDir | null;
    openFolders: string[];
    selectedFiles: string[];
    noDeselectFiles: string[];
  }

  interface NewTemplateInfo {
    name: string;
    displayName: string;
    version: string;
    description: string;
  }

  const initialState = {
    tab: "template" as TabName,
    error: {
      status: "idle",
    } as LazyVoid,
    initialTemplateInfo: {
      selectedTemplate: undefined,
      editorVersion: {} as TauriTypes.UnityEditorInstall,
    },
    packageInfo: {
      selectedPackages: [],
      gitPackages: [],
      localPackages: [],
      templatePackages: [],
    },
    filesInfo: {
      root: null,
      openFolders: [],
      selectedFiles: [],
      noDeselectFiles: [],
    },
    basicInfo: {
      name: "New Project",
      path: "",
    },
    newTemplateInfo: {
      name: "com.name.template",
      displayName: "New Template",
      version: "1.0.0",
      description: "A custom template",
    },
  };

  export const Context = createContext<Type>({
    state: initialState,
    dispatch: () => {},
  });

  type Action =
    | { type: "change_tab"; tab: TabName }
    | {
        type: "set_has_error";
        hasError: boolean;
        message?: Error | null;
      }
    | {
        type: "set_editor_version";
        editor: TauriTypes.UnityEditorInstall;
      }
    | {
        type: "set_initial_template";
        template?: TauriTypes.SurfaceTemplate;
      }
    | {
        type: "set_template_packages";
        packages: TauriTypes.MinimalPackage[];
      }
    | {
        type: "set_selected_packages";
        packages: SelectedPackage[];
      }
    | { type: "set_files_root"; root: TauriTypes.FileDir }
    | { type: "set_files_open_folders"; folders: string[] }
    | { type: "set_files_selected_files"; files: string[] }
    | { type: "set_files_no_deselect_files"; files: string[] }
    | { type: "reset_files" }
    | { type: "set_basic_info_name"; name: string }
    | { type: "set_basic_info_path"; path: string }
    | { type: "set_new_template_name"; name: string }
    | { type: "set_new_template_display_name"; displayName: string }
    | { type: "set_new_template_version"; version: string }
    | { type: "set_new_template_description"; description: string }
    | { type: "add_git_package"; package: { id: string; url: string } }
    | { type: "add_local_package"; package: { path: string } }
    | { type: "remove_git_package"; package: TauriTypes.MinimalPackage }
    | { type: "remove_local_package"; package: TauriTypes.MinimalPackage }
    | { type: "set_git_packages"; packages: TauriTypes.MinimalPackage[] }
    | { type: "set_local_packages"; packages: TauriTypes.MinimalPackage[] }
    | { type: "destroy_package"; package: TauriTypes.MinimalPackage };

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case "change_tab":
        return {
          ...state,
          tab: action.tab,
          error: {
            status: "idle",
          },
        };
      case "set_has_error":
        return {
          ...state,
          error: {
            status: action.hasError ? "error" : "idle",
            error: action.message,
          },
        };
      case "set_editor_version":
        return {
          ...state,
          initialTemplateInfo: {
            ...state.initialTemplateInfo,
            editorVersion: action.editor,
          },
        };
      case "set_initial_template":
        return {
          ...state,
          initialTemplateInfo: {
            ...state.initialTemplateInfo,
            selectedTemplate: action.template,
          },
        };
      case "set_template_packages":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            templatePackages: action.packages,
          },
        };
      case "set_selected_packages":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            selectedPackages: action.packages,
          },
        };
      case "set_files_root":
        return {
          ...state,
          filesInfo: {
            ...state.filesInfo,
            root: action.root,
          },
        };
      case "set_files_open_folders":
        return {
          ...state,
          filesInfo: {
            ...state.filesInfo,
            openFolders: action.folders,
          },
        };
      case "set_files_selected_files":
        return {
          ...state,
          filesInfo: {
            ...state.filesInfo,
            selectedFiles: action.files,
          },
        };
      case "set_files_no_deselect_files":
        return {
          ...state,
          filesInfo: {
            ...state.filesInfo,
            noDeselectFiles: action.files,
          },
        };
      case "reset_files":
        return {
          ...state,
          filesInfo: {
            ...state.filesInfo,
            root: null,
            openFolders: [],
            selectedFiles: [],
            noDeselectFiles: [],
          },
        };
      case "set_basic_info_name":
        return {
          ...state,
          basicInfo: {
            ...state.basicInfo,
            name: action.name,
          },
        };
      case "set_basic_info_path":
        return {
          ...state,
          basicInfo: {
            ...state.basicInfo,
            path: action.path,
          },
        };
      case "set_new_template_name":
        return {
          ...state,
          newTemplateInfo: {
            ...state.newTemplateInfo,
            name: action.name,
          },
        };
      case "set_new_template_display_name":
        return {
          ...state,
          newTemplateInfo: {
            ...state.newTemplateInfo,
            displayName: action.displayName,
          },
        };
      case "set_new_template_version":
        return {
          ...state,
          newTemplateInfo: {
            ...state.newTemplateInfo,
            version: action.version,
          },
        };
      case "set_new_template_description":
        return {
          ...state,
          newTemplateInfo: {
            ...state.newTemplateInfo,
            description: action.description,
          },
        };
      case "set_git_packages":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            gitPackages: action.packages,
          },
        };
      case "set_local_packages":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            localPackages: action.packages,
          },
        };
      case "add_git_package":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            gitPackages: [
              ...state.packageInfo.gitPackages,
              {
                name: action.package.id,
                version: action.package.url,
                isFile: false,
                isDiscoverable: true,
                type: TauriTypes.PackageType.Git,
              },
            ],
          },
        };
      case "add_local_package":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            localPackages: [
              ...state.packageInfo.localPackages,
              {
                name: action.package.path,
                version: "", // will get turned into file:../id
                isFile: false,
                isDiscoverable: true,
                type: TauriTypes.PackageType.Local,
              },
            ],
          },
        };
      case "remove_git_package":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            gitPackages: state.packageInfo.gitPackages.filter(
              (x) => x !== action.package
            ),
          },
        };
      case "remove_local_package":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            localPackages: state.packageInfo.localPackages.filter(
              (x) => x !== action.package
            ),
          },
        };
      case "destroy_package":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            templatePackages: state.packageInfo.templatePackages.filter(
              (x) => x !== action.package
            ),
            selectedPackages: state.packageInfo.selectedPackages.filter(
              (x) => x !== action.package
            ),
          },
        };
      default:
        return state;
    }
  };

  type Props = {} & React.PropsWithChildren;
  export function User(props: Props) {
    const globalContext = useContext(GlobalContext.Context);
    const [state, dispatch] = useReducer(reducer, initialState);
    const isLoading = useBetterState(false);

    useEffect(() => {
      console.log(globalContext.state);
      if (
        globalContext.state.currentTab === "new_template" &&
        globalContext.state.templateFromProject
      ) {
        isLoading.set(true);
        // need to load project files, assign them as the file root,
        // and anything else here

        const load = async () => {
          const files = await TauriRouter.load_project_files_tree(
            globalContext.state.templateFromProject!.path
          );

          const packages = await TauriRouter.load_project_packages(
            globalContext.state.templateFromProject!.path,
            globalContext.state.templateFromProject!.version
          );

          console.log(files);
          console.log(packages);

          const packagesDeps = packages.dependencies ?? {};
          const allPackages = Object.keys(packagesDeps).map(
            (x) =>
              ({
                name: x as string,
                version: packagesDeps[x as string],
              } as TauriTypes.MinimalPackage)
          );

          dispatch({
            type: "set_files_root",
            root: files,
          });
          dispatch({
            type: "change_tab",
            tab: "new-template",
          });
          dispatch({
            type: "set_files_selected_files",
            files: [...getAllFileDirIds(files)],
          });
          dispatch({
            type: "set_template_packages",
            packages: allPackages,
          });
          dispatch({
            type: "set_selected_packages",
            packages: allPackages,
          });
          isLoading.set(false);
        };

        load().catch((err) => {
          routeErrorToToast(err);
          isLoading.set(false);
        });
      }
    }, []);

    return (
      <Context.Provider value={{ state, dispatch }}>
        {isLoading.value ? <LoadingSpinner /> : props.children}
      </Context.Provider>
    );
  }
}
