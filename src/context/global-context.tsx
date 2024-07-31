import { createContext, PropsWithChildren, useReducer } from "react";

type GlobalContextType = {
	state: GlobalState;
	dispatch: React.Dispatch<Action>;
};

export type Tabs = "installs" | "projects";

export type Project = {
	name: string;
	path: string;
	version: string;
};

export type InstallModule = {
	name: string;
	id: string;
	description: string;
	category: string;
	visible: boolean;
	selected: boolean;
};
export type EditorInstall = {
	version: string;
	path: string;
	modules: InstallModule[];
};

type GlobalState = {
	currentTab: Tabs;
	projects: Project[];
	installs: EditorInstall[];
};

const initialState: GlobalState = {
	currentTab: "projects",
	projects: [],
	installs: [],
};
export const Context = createContext<GlobalContextType>(
	{} as GlobalContextType
);

type Action =
	| { type: "change_tab"; tab: Tabs }
	| { type: "set_installs"; installs: EditorInstall[] }
	| { type: "set_projects"; projects: Project[] };

const reducer = (state: GlobalState, action: Action): GlobalState => {
	switch (action.type) {
		case "change_tab":
			return { ...state, currentTab: action.tab };
		case "set_installs":
			return { ...state, installs: action.installs };
		case "set_projects":
			return { ...state, projects: action.projects };
	}
	return state;
};

export default function GlobalContext(props: PropsWithChildren) {
	const [state, dispatch] = useReducer(reducer, initialState);

	return (
		<Context.Provider value={{ state, dispatch }}>
			{props.children}
		</Context.Provider>
	);
}
