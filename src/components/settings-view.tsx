import { useEffect, useState } from "react";
import {
	ValidateInputContext,
	ValidateInputWithButton,
} from "./validate-input";
import { invoke } from "@tauri-apps/api/tauri";
import FolderOpen from "./svg/folder-open";
import { open } from "@tauri-apps/api/dialog";

type Prefs = {
	// where new projects are created
	newProjectPath?: string;
	// typically C:\Program Files\Unity\Hub\Editor
	hubEditorsPath?: string;
	// typically C:\Users\nomno\AppData\Roaming\UnityHub\
	hubAppdataPath?: string;
};

export default function SettingsView() {
	return (
		<div className="flex flex-col w-full">
			<Header />
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
	const [data, setData] = useState<Prefs>({});
	const [hasError, setHasError] = useState(false);
	const [errorStates, setErrorStates] = useState<
		Record<string, string | undefined>
	>({});

	useEffect(() => {
		invoke("get_prefs").then((prefs) => {
			console.log(prefs);
			const tmpPrefs = prefs as Prefs;
			setData({
				newProjectPath: tmpPrefs.newProjectPath,
				hubEditorsPath: tmpPrefs.hubEditorsPath,
				hubAppdataPath: tmpPrefs.hubAppdataPath,
			} as Prefs);
		});
		checkPaths();
	}, []);

	useEffect(() => {
		checkPaths();
	}, [data]);

	function checkPaths() {
		checkError("newProjectPath", data.newProjectPath ?? "");
		checkError("hubEditorsPath", data.hubEditorsPath ?? "");
		checkError("hubAppdataPath", data.hubAppdataPath ?? "");
	}

	function getErrorState(name: string): string | undefined {
		return errorStates[name];
	}

	async function checkError(name: string, value: string): Promise<boolean> {
		if (!value || value.length === 0) {
			setErrorStates((s) => ({ ...s, [name]: "Path cannot be empty" }));
			return false;
		}

		try {
			const result: boolean = await invoke("is_valid_folder_dir", {
				path: value,
				needsEmpty: false,
				needsExists: true,
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

		setData((s) => {
			const prefs = { ...s, [key]: path as string };
			invoke("save_prefs", { dummyPrefs: prefs });
			return prefs;
		});
	}

	return (
		<div className="w-full max-w-6xl self-center overflow-y-auto h-full">
			<div className="flex flex-col px-8 py-4 gap-2">
				<ValidateInputContext onErrorChanged={setHasError}>
					<ValidateInputWithButton
						label="New Project Path"
						name="newProjectPath"
						value={data.newProjectPath ?? ""}
						errorMessage={() => getErrorState("newProjectPath") ?? ""}
						hasError={() => !!getErrorState("newProjectPath")}
						onChange={(e) =>
							setData((s) => ({ ...s, projectPath: e.target.value }))
						}
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
						label="Hub Editors Path"
						name="hubEditorsPath"
						value={data.hubEditorsPath ?? ""}
						errorMessage={() => getErrorState("hubEditorsPath") ?? ""}
						hasError={() => !!getErrorState("hubEditorsPath")}
						onChange={(e) =>
							setData((s) => ({ ...s, hubEditorsPath: e.target.value }))
						}
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
						label="Hub Appdata Path"
						name="hubAppdataPath"
						value={data.hubAppdataPath ?? ""}
						errorMessage={() => getErrorState("hubAppdataPath") ?? ""}
						hasError={() => !!getErrorState("hubAppdataPath")}
						onChange={(e) =>
							setData((s) => ({ ...s, hubAppdataPath: e.target.value }))
						}
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
