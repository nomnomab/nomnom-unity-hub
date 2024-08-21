import { createContext, PropsWithChildren, useReducer } from "react";
import { TauriTypes } from "../utils/tauri-types";

export namespace GlobalContext {
  type Type = {
    state: State;
    dispatch: React.Dispatch<Action>;
  };

  export type TabName =
    | "editors"
    | "projects"
    | "new_project"
    | "new_template"
    | "settings";

  type State = {
    currentTab: TabName;
    templateFromProject?: TauriTypes.Project;
  };

  const initialState: State = {
    currentTab: "projects",
  };

  export const Context = createContext<Type>({
    state: initialState,
    dispatch: () => {},
  } as Type);

  type Action =
    | { type: "change_tab"; tab: TabName }
    | {
        type: "change_tab";
        tab: "template_from_project";
        project: TauriTypes.Project;
      };

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case "change_tab":
        if (action.tab === "template_from_project") {
          return {
            ...state,
            currentTab: "new_template",
            templateFromProject: action.project,
          };
        }
        return {
          ...state,
          currentTab: action.tab,
          templateFromProject: undefined,
        };
      default:
        return state;
    }
  };

  export function User(props: PropsWithChildren) {
    const [state, dispatch] = useReducer(reducer, {
      ...initialState,
    });

    return (
      <Context.Provider value={{ state, dispatch }}>
        {props.children}
      </Context.Provider>
    );
  }
}

export {};
