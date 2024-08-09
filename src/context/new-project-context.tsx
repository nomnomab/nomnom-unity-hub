import { createContext, useReducer } from "react";
import { TauriTypes } from "../utils/tauri-types";

export namespace NewProjectContext {
  interface Type {
    state: State;
    dispatch: React.Dispatch<Action>;
  }

  type TabName = "template" | "package" | "files" | "info";
  const TabNameArray = ["template", "package", "files", "info"];

  export const getTabIndex = (tab: TabName): number => {
    return TabNameArray.indexOf(tab);
  };

  export const getTabsLength = (): number => {
    return TabNameArray.length;
  };

  export const getPreviousTab = (tab: TabName): TabName | null => {
    const index = TabNameArray.indexOf(tab);
    if (index === 0) {
      return null;
    }

    return TabNameArray[index - 1] as TabName;
  };

  export const getNextTab = (tab: TabName): TabName | null => {
    const index = TabNameArray.indexOf(tab);
    if (index === TabNameArray.length - 1) {
      return null;
    }

    return TabNameArray[index + 1] as TabName;
  };

  export const onFirstTab = (tab: TabName): boolean => {
    return TabNameArray.indexOf(tab) === 0;
  };

  export const onLastTab = (tab: TabName): boolean => {
    return TabNameArray.indexOf(tab) === TabNameArray.length - 1;
  };

  interface State {
    tab: TabName;
    initialTemplateInfo: InitialTemplateInfo;
    packageInfo: PackageInfo;
    basicInfo: BasicInfo;
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
    selectedPackages: string[];
  }

  const initialState = {
    tab: "template" as TabName,
    initialTemplateInfo: {
      selectedTemplate: undefined,
      editorVersion: {} as TauriTypes.UnityEditorInstall,
    },
    packageInfo: {
      selectedPackages: [],
    },
    basicInfo: {
      name: "New Project",
      path: "",
    },
  };

  export const Context = createContext<Type>({
    state: initialState,
    dispatch: () => {},
  });

  type Action =
    | { type: "change_tab"; tab: TabName }
    | {
        type: "set_editor_version";
        editor: TauriTypes.UnityEditorInstall;
      }
    | {
        type: "set_initial_template";
        template?: TauriTypes.SurfaceTemplate;
      }
    | {
        type: "set_packages";
        packages: string[];
      };

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case "change_tab":
        return { ...state, tab: action.tab };
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
      case "set_packages":
        return {
          ...state,
          packageInfo: {
            ...state.packageInfo,
            selectedPackages: action.packages,
          },
        };
      default:
        return state;
    }
  };

  export function User(props: React.PropsWithChildren) {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
      <Context.Provider value={{ state, dispatch }}>
        {props.children}
      </Context.Provider>
    );
  }
}
