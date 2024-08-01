import React, { useContext, useEffect, useState } from "react";
import {
	Context,
	MinimalTemplate,
	Template,
	TemplateDependencies,
} from "../context/global-context";
import { invoke } from "@tauri-apps/api/tauri";
import { Item, Menu, TriggerEvent, useContextMenu } from "react-contexify";
import { Lazy } from "../utils";
import LoadingSpinner from "./svg/loading-spinner";
import EllipsisVertical from "./svg/ellipsis-vertical";
import EditorVersionSelect from "./editor-version-select";

type Data = {
	readableTemplates: MinimalTemplate[];
	template: Lazy<Template>;
	version: string;
	selectedTemplate?: string;
	selectedPackages: string[];
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

function selectAllDependencies(data: Data): string[] {
	if (!data.template) return [];
	if (!data.template.value) return [];
	return Object.keys(getAllDependencies(data.template.value));
}

export default function NewProjectView() {
	const { state } = useContext(Context);
	const [data, setData] = useState<Data>({
		projectName: "New Project",
		creatingProjectStatus: "idle",
	} as Data);

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
			setData((s) => ({
				...s,
				selectedPackages: selectAllDependencies(s),
			}));
		}, 25);
	}, [data.selectedTemplate]);

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
				selectedTemplate: templates[0].name,
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

	if (data.creatingProjectStatus === "loading") {
		return (
			<div className="flex flex-col w-full h-full items-center justify-center">
				<p className="pb-4">Creating project...</p>
				<LoadingSpinner />
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full">
			<Header data={data} setData={setData} />
			<div className="flex justify-center w-full h-full overflow-hidden">
				<div className="flex flex-grow w-full max-w-6xl">
					<div className="flex flex-col w-6/12 border-r border-r-stone-700 overflow-y-auto">
						<Templates data={data} setData={setData} />
						<Packages data={data} setData={setData} />
					</div>
					<InfoPanel data={data} setData={setData} />
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
	const { show } = useContextMenu({
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
		setData({
			...data,
			version,
			selectedTemplate: undefined,
		});

		invoke("set_last_used_editor", { editorVersion: version });
	}

	return (
		<div className="flex flex-row border-b border-b-stone-700 justify-center">
			<div className="flex flex-row w-full max-w-6xl px-12 py-8 items-end">
				<h1 className="text-stone-50">New Project</h1>
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
	const isSelected = (x: MinimalTemplate) => {
		return data.selectedTemplate === x.name;
	};

	function selectTemplate(x: MinimalTemplate) {
		setData((s) => ({
			...s,
			selectedTemplate: x.name,
			selectedPackages: [],
		}));
	}

	return (
		<div className="p-6 flex flex-col gap-2">
			<p className="text-lg text-stone-50">Templates</p>
			{data.readableTemplates.map((x) => (
				<div key={x.name} className="flex flex-col">
					<div
						className={`rounded-md flex px-6 py-3 border border-stone-600 text-sm cursor-pointer transition-colors ${
							isSelected(x)
								? "border-sky-600 text-stone-50 hover:bg-sky-800"
								: "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
						}`}
						onClick={() => selectTemplate(x)}
					>
						<p>{x.displayName}</p>
						<p className="ml-auto">{x.version}</p>
					</div>
				</div>
			))}
		</div>
	);
}

function Packages({
	data,
	setData,
}: {
	data: Data;
	setData: React.Dispatch<React.SetStateAction<Data>>;
}) {
	const [gitPackage, setGitPackage] = useState(
		"https://github.com/Cysharp/UniTask.git?path=src/UniTask/Assets/Plugins/UniTask"
	);
	const [loadingGitPackage, setLoadingGitPackage] = useState<Lazy<string>>({
		status: "idle",
		value: null,
	});

	if (data.template?.status === "loading") {
		return <LoadingSpinner />;
	}

	const template = data.template?.value;
	if (!template) return null;
	if (!template?.dependencies) return null;

	function selectPackage(x: string) {
		setData({
			...data,
			selectedPackages: data.selectedPackages.includes(x)
				? data.selectedPackages.filter((y) => y !== x)
				: [...data.selectedPackages, x],
		});
	}

	function isSelected(x: string) {
		return data.selectedPackages.includes(x);
	}

	function selectAll() {
		setData({
			...data,
			selectedPackages: selectAllDependencies(data),
		});
	}

	function selectNone() {
		setData({
			...data,
			selectedPackages: [],
		});
	}

	async function addGitPackage() {
		const packages = getAllDependencies(data.template?.value);
		const values = Object.values(packages);
		if (!values.filter((x) => x === gitPackage).length) {
			if (data.template?.value?.dependencies !== undefined) {
				setLoadingGitPackage({ status: "loading", value: null });

				const json: {
					name: string;
					version: string;
				} = await invoke("get_git_package_json", { url: gitPackage });

				setData({
					...data,
					template: {
						...data.template,
						value: {
							...data.template.value,
							dependencies: {
								...data.template.value.dependencies,
								custom: {
									...data.template.value.dependencies.custom,
									[json.name]: {
										version: json.version,
										gitUrl: gitPackage,
									},
								},
							},
						},
					},
					selectedPackages: [...data.selectedPackages, json.name],
				});

				setLoadingGitPackage({ status: "idle", value: null });
			}
		}
	}

	return (
		<div className="p-6 flex flex-col">
			<p className="text-lg text-stone-50">Packages</p>

			<div className="flex gap-2 mb-3">
				<p className="place-self-end leading-none">
					{data.selectedPackages.length} selected
				</p>
				<button
					className="ml-auto rounded-md bg-stone-700 text-stone-50 px-3 py-1"
					onClick={selectAll}
				>
					Select All
				</button>
				<button
					className="rounded-md bg-stone-700 text-stone-50 px-3 py-1"
					onClick={selectNone}
				>
					Select None
				</button>
			</div>

			<div className="flex flex-col gap-2">
				<p>Internal</p>
				{Object.keys(data.template.value?.dependencies.internal || {})
					.length === 0 && (
					<p className="text-stone-50">No internal dependencies</p>
				)}
				{Object.keys(data.template.value?.dependencies.internal || {})
					.sort()
					.map((x) => {
						const dep = getDependency(template, x);
						if (!dep) return null;

						return (
							<div key={x} className="flex flex-col">
								<div
									className={`rounded-md flex px-6 py-3 border text-sm cursor-pointer transition-colors gap-1 ${
										isSelected(x)
											? "border-sky-600 text-stone-50 hover:bg-sky-800"
											: "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
									}`}
									onClick={() => selectPackage(x)}
								>
									<p>{x}</p>
									<p className="ml-auto text-ellipsis overflow-hidden max-w-32 whitespace-nowrap">
										{dep.version}
									</p>
								</div>
							</div>
						);
					})}

				<p>Custom</p>
				{Object.keys(data.template.value?.dependencies.custom || {}).length ===
					0 && <p className="text-stone-400">No custom dependencies</p>}
				{Object.keys(data.template.value?.dependencies.custom || {})
					.sort()
					.map((x) => {
						const dep = getDependency(template, x);
						if (!dep) return null;

						return (
							<div key={x} className="flex flex-col">
								<div
									className={`rounded-md flex px-6 py-3 border text-sm cursor-pointer transition-colors gap-1 ${
										isSelected(x)
											? "border-sky-600 text-stone-50 hover:bg-sky-800"
											: "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
									}`}
									onClick={() => selectPackage(x)}
								>
									<p>{x}</p>
									<p className="ml-auto text-ellipsis overflow-hidden max-w-32 whitespace-nowrap">
										{dep.version}
									</p>
								</div>
							</div>
						);
					})}
			</div>

			{/* <p className="mt-2">Add package</p>
			<div className="flex mt-1 gap-2">
				<input
					type="text"
					placeholder="name"
					className="w-6/12 p-2 rounded-md border border-stone-600 bg-stone-800"
				/>

				<input
					type="text"
					placeholder="version"
					className="w-6/12 p-2 rounded-md border border-stone-600 bg-stone-800"
				/>

				<button
					className="rounded-md bg-stone-700 text-stone-50 px-3 py-1"
					onClick={() => {}}
				>
					Add
				</button>
			</div> */}

			<p className="mt-8">Add git package</p>
			<div className="flex mt-1 gap-2">
				<input
					type="text"
					placeholder="url"
					value={gitPackage}
					onChange={(e) => setGitPackage(e.target.value)}
					className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
				/>

				{loadingGitPackage.status === "idle" && (
					<button
						className="rounded-md bg-stone-700 text-stone-50 px-3 py-1"
						onClick={addGitPackage}
					>
						Add
					</button>
				)}
				{loadingGitPackage.status === "loading" && <LoadingSpinner />}
			</div>
		</div>
	);
}

function InfoPanel({
	data,
	setData,
}: {
	data: Data;
	setData: React.Dispatch<React.SetStateAction<Data>>;
}) {
	const { dispatch } = useContext(Context);

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
				packages: data.selectedPackages.map((x) => {
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

	return (
		<div className="p-6 flex flex-col w-6/12 overflow-hidden">
			<InfoPanelTemplateDetails data={data} setData={setData} />

			<div className="mt-auto pt-8 flex flex-col flex-shrink-0">
				<p>Project Name</p>
				<input
					type="text"
					placeholder="Project Name..."
					value={data.projectName}
					className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
				/>

				<p className="mt-4">Project Path</p>
				<input
					type="text"
					placeholder="Project Path..."
					value={data.projectPath}
					className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
				/>

				<div className="flex gap-2 justify-end">
					<button
						className="rounded-md bg-stone-700 text-stone-50 px-3 py-1 mt-4"
						onClick={cancel}
					>
						Cancel
					</button>
					<button
						className="rounded-md bg-sky-600 text-stone-50 px-3 py-1 mt-4"
						onClick={create}
					>
						Create
					</button>
				</div>
			</div>
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
			console.log(rawTemplate.dependencies);

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

			console.log(template);

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
		(t) => t.name === data.selectedTemplate
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
				<p className="text-lg text-stone-50">
					{data.template?.value?.displayName ?? "Nothing to show"}
				</p>
				<button
					className="ml-auto flex items-center w-[30px] h-[30px] justify-center aspect-square rounded-md text-stone-50 hover:bg-stone-700"
					onClick={openOptions}
				>
					<EllipsisVertical width={20} height={20} />
				</button>
			</div>

			<p className="flex flex-grow overflow-y-auto">
				{data.template?.value?.description ?? "Nothing to show"}
			</p>

			<Menu id="template-menu">
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
