import { createContext, PropsWithChildren, useReducer } from "react";
import { Editor } from "./global-context";

type NewTemplateContextType = {
	state: NewTemplateState;
	dispatch: React.Dispatch<Action>;
};

type NewTemplateState = {
	editor: Editor;
	projectZip?: string;
};

const initialState: NewTemplateState = {} as NewTemplateState;

export const Context = createContext<NewTemplateContextType>({
	state: initialState,
	dispatch: () => null,
});

type Action = {
	type: "set_editor";
	editor: Editor;
};

const reducer = (state: NewTemplateState, action: Action) => {
	switch (action.type) {
		case "set_editor":
			return { ...state, editor: action.editor };
		default:
			return state;
	}
};

export default function NewTemplateContext(props: PropsWithChildren) {
	const [state, dispatch] = useReducer(reducer, {
		...initialState,
	});

	return (
		<Context.Provider value={{ state, dispatch }}>
			{props.children}
		</Context.Provider>
	);
}
