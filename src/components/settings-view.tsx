import { useContext, useEffect, useState } from "react";
import {
	ValidateInputContext,
	ValidateInputWithButton,
} from "./validate-input";
import { invoke } from "@tauri-apps/api/tauri";
import FolderOpen from "./svg/folder-open";
import { open } from "@tauri-apps/api/dialog";
import { Context, Prefs } from "../context/global-context";

type Props = {
	overrideClassName?: string;
	noHeader?: boolean;
};
export default function SettingsView(props: Props) {
	return (
		<div className={props.overrideClassName ?? "flex flex-col w-full"}>
			{!props.noHeader && <Header />}
			<Body />
		</div>
	);
}

function Header() {
	return (
		<div className="flex flex-row border-b border-b-stone-700 justify-center">
			<div className="flex flex-row w-full max-w-6xl px-8 py-8 items-center select-none">
				<h1 className="text-stone-50">Settings</h1>
			</div>
		</div>
	);
}

function Body() {
	const { state, dispatch } = useContext(Context);
	// const [data, setData] = useState<Prefs>({});
	const [hasError, setHasError] = useState(false);
	const [errorStates, setErrorStates] = useState<
		Record<string, string | undefined>
	>({});

	useEffect(() => {
		invoke("get_prefs").then((prefs) => {
			const tmpPrefs = prefs as Prefs;
			dispatch({
				type: "set_prefs",
				prefs: {
					newProjectPath: tmpPrefs.newProjectPath,
					hubPath: tmpPrefs.hubPath,
					hubEditorsPath: tmpPrefs.hubEditorsPath,
					hubAppdataPath: tmpPrefs.hubAppdataPath,
				} as Prefs,
			});
		});
		checkPaths();
		dispatch({ type: "set_has_bad_pref", hasBadPref: hasError });
	}, []);

	useEffect(() => {
		checkPaths();
	}, [state.prefs]);

	useEffect(() => {
		dispatch({ type: "set_has_bad_pref", hasBadPref: hasError });
	}, [hasError]);

	function checkPaths() {
		checkError("newProjectPath", state.prefs.newProjectPath ?? "", true);
		checkError("hubPath", state.prefs.hubPath ?? "", false);
		checkError("hubEditorsPath", state.prefs.hubEditorsPath ?? "", true);
		checkError("hubAppdataPath", state.prefs.hubAppdataPath ?? "", true);
	}

	function getErrorState(name: string): string | undefined {
		return errorStates[name];
	}

	async function checkError(
		name: string,
		value: string,
		isFolder: boolean
	): Promise<boolean> {
		if (!value || value.length === 0) {
			setErrorStates((s) => ({ ...s, [name]: "Path cannot be empty" }));
			return false;
		}

		try {
			const result: boolean = await invoke("is_valid_path", {
				path: value,
				needsEmpty: false,
				needsExists: true,
				isFolder,
			});

			setErrorStates((s) => ({ ...s, [name]: undefined }));

			return result;
		} catch (err: any) {
			console.error(err);
			setErrorStates((s) => ({ ...s, [name]: err }));
		}

		return false;
	}

	async function selectProjectFolder(key: string) {
		const path = await open({
			directory: true,
			multiple: false,
			// @ts-ignore
			defaultPath: data[key],
		});

		if (!path) return;

		const prefs = { ...state.prefs, [key]: path as string };
		dispatch({ type: "set_prefs", prefs });
	}

	function savePrefs() {
		dispatch({ type: "save_prefs" });
	}

	return (
		<div className="w-full max-w-6xl self-center overflow-y-auto h-full">
			<div className="flex flex-col px-8 py-4 gap-2">
				<ValidateInputContext onErrorChanged={setHasError}>
					<ValidateInputWithButton
						label="New Project Path"
						name="newProjectPath"
						value={state.prefs.newProjectPath ?? ""}
						errorMessage={() => getErrorState("newProjectPath") ?? ""}
						hasError={() => !!getErrorState("newProjectPath")}
						onChange={(e) =>
							// setData((s) => ({ ...s, projectPath: e.target.value }))
							dispatch({
								type: "set_prefs",
								prefs: { ...state.prefs, newProjectPath: e.target.value },
							})
						}
						onBlur={() => savePrefs()}
						className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
						divProps={{
							className: "flex-grow",
						}}
					>
						<button
							className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
							onClick={() => selectProjectFolder("newProjectPath")}
						>
							<FolderOpen />
						</button>
					</ValidateInputWithButton>

					<ValidateInputWithButton
						label="Unity Hub Path"
						name="hubPath"
						value={state.prefs.hubPath ?? ""}
						errorMessage={() => getErrorState("hubPath") ?? ""}
						hasError={() => !!getErrorState("hubPath")}
						onChange={(e) =>
							// setData((s) => ({ ...s, hubPath: e.target.value }))
							dispatch({
								type: "set_prefs",
								prefs: { ...state.prefs, hubPath: e.target.value },
							})
						}
						onBlur={() => savePrefs()}
						className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
						divProps={{
							className: "flex-grow",
						}}
					>
						<button
							className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
							onClick={() => selectProjectFolder("hubPath")}
						>
							<FolderOpen />
						</button>
					</ValidateInputWithButton>

					<ValidateInputWithButton
						label="Unity Hub Editors Path"
						name="hubEditorsPath"
						value={state.prefs.hubEditorsPath ?? ""}
						errorMessage={() => getErrorState("hubEditorsPath") ?? ""}
						hasError={() => !!getErrorState("hubEditorsPath")}
						onChange={(e) =>
							// setData((s) => ({ ...s, hubEditorsPath: e.target.value }))
							dispatch({
								type: "set_prefs",
								prefs: { ...state.prefs, hubEditorsPath: e.target.value },
							})
						}
						onBlur={() => savePrefs()}
						className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
						divProps={{
							className: "flex-grow",
						}}
					>
						<button
							className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
							onClick={() => selectProjectFolder("hubEditorsPath")}
						>
							<FolderOpen />
						</button>
					</ValidateInputWithButton>

					<ValidateInputWithButton
						label="Unity Hub Appdata Path"
						name="hubAppdataPath"
						value={state.prefs.hubAppdataPath ?? ""}
						errorMessage={() => getErrorState("hubAppdataPath") ?? ""}
						hasError={() => !!getErrorState("hubAppdataPath")}
						onChange={(e) =>
							// setData((s) => ({ ...s, hubAppdataPath: e.target.value }))
							dispatch({
								type: "set_prefs",
								prefs: { ...state.prefs, hubAppdataPath: e.target.value },
							})
						}
						onBlur={() => savePrefs()}
						className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
						divProps={{
							className: "flex-grow",
						}}
					>
						<button
							className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
							onClick={() => selectProjectFolder("hubAppdataPath")}
						>
							<FolderOpen />
						</button>
					</ValidateInputWithButton>
				</ValidateInputContext>
			</div>
		</div>
	);
}
