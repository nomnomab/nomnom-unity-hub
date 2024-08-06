import { createContext, PropsWithChildren, useReducer } from "react";

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
  };

  const initialState: State = {
    currentTab: "projects",
  };

  export const Context = createContext<Type>({
    state: initialState,
    dispatch: () => {},
  } as Type);

  type Action = { type: "change_tab"; tab: TabName };

  const reducer = (state: State, action: Action): State => {
    switch (action.type) {
      case "change_tab":
        return { ...state, currentTab: action.tab };
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
