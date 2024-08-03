import React, { useContext, useEffect, useState } from "react";
import {
	Context,
	convertRustTemplateToTS,
	MinimalTemplate,
	Template,
} from "../context/global-context";
import { invoke } from "@tauri-apps/api/tauri";
import { Item, Menu, TriggerEvent, useContextMenu } from "react-contexify";
import { Lazy } from "../utils";
import LoadingSpinner from "./svg/loading-spinner";
import EllipsisVertical from "./svg/ellipsis-vertical";
import EditorVersionSelect from "./editor-version-select";
import { Context as NewTemplateContext } from "../context/new-template-context";
import PackagePicker, { PackagePickerState } from "./package-picker";
import Delete from "./svg/delete";
import Popup from "reactjs-popup";
import {
	ValidateInput,
	ValidateInputContext,
	ValidateInputWithButton,
} from "./validate-input";
import FolderOpen from "./svg/folder-open";
import { open } from "@tauri-apps/api/dialog";

type Data = {
	readableTemplates: MinimalTemplate[];
	template: Lazy<Template>;
	version: string;
	selectedTemplate?: string;
	// selectedPackages: string[];
	projectName: string;
	projectPath: string;
	creatingProjectStatus: "idle" | "loading" | "error";
};

function getAllDependencies(template: Template | null | undefined): {
	[key: string]: string;
} {
	if (!template) return {};
	return {
		...template.dependencies.internal,
		...Object.keys(template.dependencies.custom).reduce(
			(acc, x) => ({
				...acc,
				[x]: template.dependencies.custom[x].version,
			}),
			{}
		),
	};
}

function getSelectedDepdendencies(
	template: Template | null | undefined,
	selected: string[]
): { [key: string]: string } {
	if (!template) return {};
	const deps = getAllDependencies(template);
	return Object.fromEntries(selected.map((x) => [x, deps[x]]));
}

function getDependency(
	template: Template | null | undefined,
	key: string
):
	| { type: "internal"; version: string }
	| { type: "custom"; version: string; gitUrl?: string }
	| undefined {
	if (!template) return undefined;

	if (template.dependencies.internal[key]) {
		return {
			type: "internal",
			version: template.dependencies.internal[key],
		};
	}

	if (template.dependencies.custom[key]) {
		return {
			type: "custom",
			...template.dependencies.custom[key],
		};
	}

	return undefined;

	// return getAllDependencies(template)[key];
}

function selectAllDependencies(
	template: Template | null | undefined
): string[] {
	if (!template) return [];
	return Object.keys(getAllDependencies(template));
}

export default function NewProjectView() {
	const { state } = useContext(Context);
	const [data, setData] = useState<Data>({
		projectName: "New Project",
		creatingProjectStatus: "idle",
	} as Data);
	const [packagePickerState, setPackagePickerState] =
		useState<PackagePickerState>({
			template: data.template,
			selectedPackages: [] as string[],
		} as PackagePickerState);

	useEffect(() => {
		state.getEditors().then(load);
		invoke("get_default_project_path").then((path) => {
			setData((s) => ({ ...s, projectPath: path as string }));
		});
	}, []);

	useEffect(() => {
		loadTemplates(data.version);
	}, [data.version]);

	useEffect(() => {
		setTimeout(() => {
			setPackagePickerState((s) => ({
				...s,
				template: data.template,
				selectedPackages: selectAllDependencies(data.template?.value),
			}));
		}, 25);
	}, [data.template, data.selectedTemplate]);

	async function load() {
		const lastEditorVersion: string = await invoke("get_last_used_editor");
		setData((s) => ({
			...s,
			version: lastEditorVersion,
		}));

		await loadTemplates(lastEditorVersion);
	}

	async function loadTemplates(version: string) {
		if (!version) {
			return;
		}

		const templates: MinimalTemplate[] = await invoke("get_quick_templates", {
			editorVersion: version,
		});

		if (!data.selectedTemplate) {
			setData((s) => ({
				...s,
				readableTemplates: templates,
				selectedTemplate: templates[0].id,
				selectedPackages: [],
			}));
			return;
		}

		setData((s) => ({
			...s,
			readableTemplates: templates,
			selectedPackages: [],
		}));
	}

	if (!data.readableTemplates) {
		return <div>Loading...</div>;
	}

	// if (data.creatingProjectStatus === "loading") {
	// 	return (
	// 		<div className="flex flex-col w-full h-full items-center justify-center">
	// 			<p className="pb-4">Creating project...</p>
	// 			<LoadingSpinner />
	// 		</div>
	// 	);
	// }

	return (
		<div className="flex flex-col w-full">
			<Header data={data} setData={setData} />
			<div className="flex justify-center w-full h-full overflow-hidden">
				<div className="flex flex-grow w-full max-w-6xl">
					<div className="flex flex-col w-6/12 border-r border-r-stone-700 overflow-y-auto">
						<Templates data={data} setData={setData} />
						{/* <Packages data={data} setData={setData} /> */}
						<div className="p-6">
							<PackagePicker
								state={packagePickerState}
								setState={setPackagePickerState}
							/>
						</div>
					</div>
					<InfoPanel
						data={data}
						setData={setData}
						packageData={packagePickerState}
					/>
				</div>
			</div>
		</div>
	);
}

function Header({
	data,
	setData,
}: {
	data: Data;
	setData: React.Dispatch<React.SetStateAction<Data>>;
}) {
	const { state } = useContext(Context);
	const { show, hideAll } = useContextMenu({
		id: "editor_version",
	});

	function openOptions(event: TriggerEvent) {
		event.stopPropagation();
		show({
			id: "editor_version",
			event,
			props: {},
		});
	}

	function versionSelected(version: string) {
		setData((s) => ({
			...s,
			version,
			selectedTemplate: undefined,
		}));

		invoke("set_last_used_editor", { editorVersion: version });
		hideAll();
	}

	return (
		<div className="flex flex-row border-b border-b-stone-700 justify-center">
			<div className="flex flex-row w-full max-w-6xl px-8 py-8 items-end">
				<h1 className="text-stone-50 select-none">New Project</h1>
				<EditorVersionSelect
					className="ml-auto"
					version={data.version}
					versions={state.editors}
					onChange={versionSelected}
				/>
			</div>
		</div>
	);
}

function Templates({
	data,
	setData,
}: {
	data: Data;
	setData: React.Dispatch<React.SetStateAction<Data>>;
}) {
	const { state, dispatch } = useContext(Context);
	const { dispatch: newTemplateDispatch } = useContext(NewTemplateContext);
	const [showLoading, setShowLoading] = useState(false);
	const isSelected = (x: MinimalTemplate) => {
		return data.selectedTemplate === x.id;
	};

	function selectTemplate(x: MinimalTemplate) {
		setData((s) => ({
			...s,
			selectedTemplate: x.id,
			selectedPackages: [],
		}));
	}

	function gotoNewTemplate() {
		newTemplateDispatch({
			type: "set_editor",
			editor: state.editors.find((x) => x.version === data.version)!,
		});
		dispatch({ type: "change_tab", tab: "new_template" });
	}

	async function deleteCustomTemplate(template: MinimalTemplate) {
		setShowLoading(true);
		await invoke("delete_custom_template", { header: template });
		setShowLoading(false);

		setData((s) => ({
			...s,
			selectedTemplate: data.readableTemplates[0].id,
			readableTemplates: data.readableTemplates.filter(
				(x) => x.id !== template.id
			),
		}));
	}

	return (
		<div className="p-6 flex flex-col gap-2">
			<div className="flex gap-2">
				<p className="text-lg text-stone-50 select-none">Templates</p>
				<button
					className="ml-auto rounded-md bg-stone-700 text-stone-50 px-3 py-1 select-none"
					onClick={gotoNewTemplate}
				>
					New
				</button>
			</div>
			{data.readableTemplates.map((x) => (
				<div key={x.id} className="flex">
					<div
						className={`rounded-md flex px-6 py-3 border text-sm cursor-pointer transition-colors select-none flex-grow ${
							isSelected(x)
								? "border-sky-600 text-stone-50 hover:bg-sky-800"
								: "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
						} ${!!x.isCustom && "rounded-tr-none rounded-br-none border-r-0"}`}
						onClick={() => selectTemplate(x)}
					>
						<p>{x.displayName}</p>
						<p className="ml-auto">{x.version}</p>
					</div>
					{!!x.isCustom && (
						<button
							className={`w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border ${
								isSelected(x)
									? "border-sky-600 text-stone-50 hover:bg-sky-800"
									: "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
							}`}
							onClick={() => deleteCustomTemplate(x)}
						>
							<Delete />
						</button>
					)}
				</div>
			))}
			<p className="text-sm pt-2 text-center">
				To get additional templates, download them via the Unity Hub.
			</p>

			<Popup position="center center" modal open={showLoading}>
				<div className="bg-[#0c0a09b4] fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center">
					<div className="px-8 py-6 flex flex-col items-center justify-center bg-stone-900 border border-stone-600 rounded-md gap-4 select-none">
						<p className="text-center">Deleting template...</p>
						<LoadingSpinner />
					</div>
				</div>
			</Popup>
		</div>
	);
}

function InfoPanel({
	data,
	setData,
	packageData,
}: {
	data: Data;
	setData: React.Dispatch<React.SetStateAction<Data>>;
	packageData: PackagePickerState;
}) {
	const { dispatch } = useContext(Context);
	const [canSubmit, setCanSubmit] = useState(true);
	const [validProjectPath, setValidProjectPath] = useState<
		string | undefined
	>();

	useEffect(() => {
		checkProjectPathValidity();
	}, []);

	useEffect(() => {
		if (!data.projectPath || data.projectPath.length === 0) {
			setValidProjectPath("Project path is required");
			return;
		}

		checkProjectPathValidity();
	}, [data, data.projectPath]);

	function checkProjectPathValidity() {
		invoke("is_valid_new_project_root_dir", {
			path: data.projectPath,
			name: data.projectName,
		})
			.then(() => setValidProjectPath(undefined))
			.catch((err) => {
				console.error(err);
				setValidProjectPath(err);
			});
	}

	if (!data.selectedTemplate) {
		return (
			<div className="p-6 flex flex-col gap-4 w-6/12">Nothing selected</div>
		);
	}

	function cancel() {
		dispatch({ type: "change_tab", tab: "projects" });
	}

	async function create() {
		const template = data.template.value!;
		const rawTemplate = {
			...template,
			dependencies: {},
		};

		setData((s) => ({ ...s, creatingProjectStatus: "loading" }));

		await invoke("generate_project", {
			data: {
				template: rawTemplate,
				outputFolder: data.projectPath,
				projectName: data.projectName,
				packages: packageData.selectedPackages.map((x) => {
					const dep = getDependency(template, x);
					const version = dep?.type === "internal" ? dep.version : dep?.gitUrl;
					return {
						name: x,
						version: version ?? "",
					};
				}),
			},
		});

		setData((s) => ({ ...s, creatingProjectStatus: "idle" }));
		dispatch({ type: "change_tab", tab: "projects" });
	}

	async function selectProjectFolder() {
		const path = await open({
			directory: true,
			multiple: false,
			defaultPath: data.projectPath,
		});

		if (!path) return;

		setData((s) => ({ ...s, projectPath: path as string }));
	}

	return (
		<div className="p-6 flex flex-col w-6/12 overflow-hidden">
			<InfoPanelTemplateDetails data={data} setData={setData} />

			<div className="mt-auto pt-8 flex flex-col flex-shrink-0 gap-1">
				<ValidateInputContext
					onErrorChanged={(hasError) => setCanSubmit(!hasError)}
				>
					<div className="flex flex-col gap-2">
						<ValidateInput
							label="Project Name"
							name="projectName"
							value={data.projectName}
							errorMessage={() => "Project name cannot be empty"}
							hasError={() =>
								!data.projectName || data.projectName.length === 0
							}
							onChange={(e) =>
								setData((s) => ({ ...s, projectName: e.target.value }))
							}
							className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
						/>

						<ValidateInputWithButton
							label="Project Path"
							name="projectPath"
							value={data.projectPath}
							errorMessage={() => validProjectPath ?? "idk"}
							hasError={() =>
								!data.projectPath ||
								data.projectPath.length === 0 ||
								validProjectPath !== undefined
							}
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
								onClick={selectProjectFolder}
							>
								<FolderOpen />
							</button>
						</ValidateInputWithButton>
					</div>

					<div className="flex gap-2 justify-end">
						<button
							className="rounded-md bg-stone-700 text-stone-50 px-3 py-1 mt-4"
							onClick={cancel}
						>
							Cancel
						</button>
						<button
							className="rounded-md bg-sky-600 text-stone-50 px-3 py-1 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={create}
							disabled={!canSubmit}
						>
							Create
						</button>
					</div>
				</ValidateInputContext>
			</div>

			<Popup
				position="center center"
				modal
				open={data.creatingProjectStatus === "loading"}
			>
				<div className="bg-[#0c0a09b4] fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center">
					<div className="px-8 py-6 flex flex-col items-center justify-center bg-stone-900 border border-stone-600 rounded-md gap-4 select-none">
						<p className="text-center">Creating project...</p>
						<LoadingSpinner />
					</div>
				</div>
			</Popup>
		</div>
	);
}

function InfoPanelTemplateDetails({
	data,
	setData,
}: {
	data: Data;
	setData: React.Dispatch<React.SetStateAction<Data>>;
}) {
	const { show } = useContextMenu({
		id: "template-menu",
	});

	function openOptions(event: TriggerEvent) {
		event.stopPropagation();
		show({
			id: "template-menu",
			event,
			props: {},
		});
	}

	useEffect(() => {
		setData((s) => ({
			...s,
			template: {
				status: "loading",
				value: null,
			},
		}));

		if (!data.selectedTemplate || data.readableTemplates.length == 0) {
			return;
		}

		let loadRequest = async () => {
			const rawTemplate = await invoke("load_template", {
				templateHeader: header,
			});

			// @ts-ignore
			const template = convertRustTemplateToTS(rawTemplate);

			setData((s) => ({
				...s,
				template: {
					status: "success",
					value: template,
				},
			}));
		};

		loadRequest();
	}, [data.selectedTemplate]);

	if (!data.selectedTemplate || data.readableTemplates.length == 0) {
		return null;
	}

	const header = data.readableTemplates.find(
		(t) => t.id === data.selectedTemplate
	);

	if (data.template?.status === "loading") {
		return <LoadingTemplate header={header} />;
	}

	function openInExplorer() {
		invoke("show_path_in_file_manager", {
			path: header!.path,
		});
	}

	return (
		<>
			<div className="flex items-center">
				<p className="text-lg text-stone-50 select-none">
					{data.template?.value?.displayName ?? "Nothing to show"}
				</p>
				<button
					className="ml-auto flex items-center w-[30px] h-[30px] justify-center aspect-square rounded-md text-stone-50 hover:bg-stone-700"
					onClick={openOptions}
				>
					<EllipsisVertical width={20} height={20} />
				</button>
			</div>

			<p className="flex flex-grow overflow-y-auto select-none">
				{data.template?.value?.description ?? "Nothing to show"}
			</p>

			<Menu id="template-menu" theme="dark_custom">
				<Item id="open" onClick={openInExplorer}>
					Open in Explorer
				</Item>
			</Menu>
		</>
	);
}

function LoadingTemplate({ header }: { header?: MinimalTemplate }) {
	return (
		<div className="flex gap-4 items-center">
			{header && <p>loading {header.displayName}</p>}
			<LoadingSpinner />
		</div>
	);
}
