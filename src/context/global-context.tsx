import { invoke } from "@tauri-apps/api/tauri";
import { createContext, PropsWithChildren, useEffect, useReducer } from "react";

type GlobalContextType = {
	state: GlobalState;
	dispatch: React.Dispatch<Action>;
};

export type Tabs = "editors" | "projects" | "new_project";

export type Project = {
	name: string;
	path: string;
	version: string;
};

export type EditorModule = {
	name: string;
	id: string;
	description: string;
	category: string;
	visible: boolean;
	selected: boolean;
};
export type Editor = {
	version: string;
	path: string;
	modules: EditorModule[];
};

export type MinimalTemplate = {
	path: string;
	name: string;
	displayName: string;
	version: string;
	editorVersion: string;
};

export type Template = {
	name: string;
	displayName: string;
	version: string;
	description: string;
	dependencies: TemplateDependencies;
};

export type TemplateDependencies = {
	internal: { [key: string]: string };
	custom: { [key: string]: { version: string; gitUrl?: string } };
};

type GlobalState = {
	currentTab: Tabs;
	projects: Project[];
	editors: Editor[];
	getEditors: () => Promise<Editor[]>;
};

const initialState: GlobalState = {
	currentTab: "projects",
	projects: [],
	editors: [],
	getEditors: () => Promise.resolve([]),
};
export const Context = createContext<GlobalContextType>(
	{} as GlobalContextType
);

type Action =
	| { type: "change_tab"; tab: Tabs }
	| { type: "set_editors"; editors: Editor[] }
	| { type: "set_projects"; projects: Project[] };

const reducer = (state: GlobalState, action: Action): GlobalState => {
	// console.log("setting state", state, action);
	switch (action.type) {
		case "change_tab":
			return { ...state, currentTab: action.tab };
		case "set_editors":
			return { ...state, editors: action.editors };
		case "set_projects":
			return { ...state, projects: action.projects };
	}
};

export default function GlobalContext(props: PropsWithChildren) {
	const [state, dispatch] = useReducer(reducer, {
		...initialState,
		getEditors,
	});

	async function getEditors(): Promise<Editor[]> {
		if (state.editors.length === 0) {
			const results: Editor[] = await invoke("get_editor_installs");
			dispatch({ type: "set_editors", editors: results });
			return results;
		}

		return state.editors;
	}

	// useEffect(() => {
	// 	loadDefaults();
	// }, []);

	// async function loadDefaults() {}

	return (
		<Context.Provider value={{ state, dispatch }}>
			{props.children}
		</Context.Provider>
	);
}
