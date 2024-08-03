import { invoke } from "@tauri-apps/api/tauri";
import { createContext, PropsWithChildren, useReducer } from "react";

type GlobalContextType = {
	state: GlobalState;
	dispatch: React.Dispatch<Action>;
};

export type Tabs =
	| "editors"
	| "projects"
	| "new_project"
	| "new_template"
	| "settings";

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
} & EditorExtra;

type EditorExtra = {
	sizeMb?: number;
};

export type MinimalTemplate = {
	path: string;
	displayName: string;
	id: string;
	version: string;
	editorVersion: string;
	isCustom?: boolean;
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
	| { type: "set_projects"; projects: Project[] }
	| { type: "set_editor_size"; editor: Editor; sizeMb: number };

const reducer = (state: GlobalState, action: Action): GlobalState => {
	// console.log("setting state", state, action);
	switch (action.type) {
		case "change_tab":
			return { ...state, currentTab: action.tab };
		case "set_editors":
			return { ...state, editors: action.editors };
		case "set_projects":
			return { ...state, projects: action.projects };
		case "set_editor_size":
			return {
				...state,
				editors: state.editors.map((e) =>
					e.path === action.editor.path ? { ...e, sizeMb: action.sizeMb } : e
				),
			};
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

export function convertRustTemplateToTS(rawTemplate: any) {
	// copy rawTemplate
	// @ts-ignore
	let template = { ...rawTemplate } as Template;
	template.dependencies = {
		internal: {},
		custom: {},
	};

	// @ts-ignore
	for (const [key, value] of Object.entries(rawTemplate.dependencies)) {
		// @ts-ignore
		template.dependencies.internal[key] = value;
	}

	return template;
}
