import { useContext, useEffect, useState } from "react";
import { Context, Project } from "../context/global-context";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import {
	Menu,
	Item,
	Separator,
	useContextMenu,
	TriggerEvent,
} from "react-contexify";
import EllipsisVertical from "./svg/ellipsis-vertical";

export default function ProjectsView() {
	const { dispatch } = useContext(Context);
	useEffect(() => {
		loadProjects();
	}, []);

	async function loadProjects() {
		const results: Project[] = await invoke("get_projects");
		dispatch({ type: "set_projects", projects: results });
	}

	return (
		<div className="flex flex-col w-full">
			<Header />
			<Projects />
		</div>
	);
}

function Header() {
	const { state, dispatch } = useContext(Context);

	async function addExistingProject() {
		const folder = await open({
			directory: true,
			multiple: false,
		});

		if (!folder) return;

		const project = await invoke("add_project", { path: folder });

		const results: Project[] = await invoke("get_projects");
		dispatch({ type: "set_projects", projects: results });
	}

	return (
		<div className="flex flex-row border-b border-b-stone-700 justify-center">
			<div className="flex flex-row w-full max-w-6xl px-12 py-8 items-center">
				<div className="text-stone-50 flex flex-row items-center">
					<h1>Projects</h1>
					{state.projects.length > 0 && (
						<h4 className="text-stone-500 text-lg ml-2 leading-none">
							({state.projects.length})
						</h4>
					)}
				</div>
				<div className="ml-auto" />
				<button
					// className="rounded-md rounded-tr-none rounded-br-none bg-stone-700 px-3 py-1"
					className="rounded-md bg-stone-700 px-3 py-1"
					onClick={addExistingProject}
				>
					Add
				</button>
				{/* <button className="rounded-md rounded-tl-none rounded-bl-none bg-stone-700 px-3 py-1 border-l border-l-stone-900">
					v
				</button> */}
				<button className="rounded-md text-stone-50 bg-sky-600 px-3 py-1 ml-3">
					New
				</button>
			</div>
		</div>
	);
}

function Projects() {
	const { state } = useContext(Context);
	return (
		<>
			{/* <ProjectsSections /> */}
			<div className="w-full max-w-6xl self-center overflow-y-auto h-full">
				<div className="flex flex-col px-8 py-4 gap-2">
					{state.projects.map((x) => (
						<ProjectItem key={x.path} project={x} />
					))}
				</div>
			</div>
		</>
	);
}

function ProjectsSections() {
	return (
		<div className="flex flex-row gap-4 flex-grow rounded-md px-12 flex-shrink">
			<p className="w-4/5 bg-zinc-900">NAME</p>
			<p className="w-[23%] bg-red-500">EDITOR</p>
		</div>
	);
}

type ProjectItemProps = {
	project: Project;
};

function ProjectItem(props: ProjectItemProps) {
	const { dispatch } = useContext(Context);
	const { show } = useContextMenu({
		id: "project-" + props.project.path,
	});

	function openOptions(event: TriggerEvent) {
		event.stopPropagation();
		show({
			id: "project-" + props.project.path,
			event,
			props: {},
		});
	}

	async function loadProjects() {
		const results: Project[] = await invoke("get_projects");
		dispatch({ type: "set_projects", projects: results });
	}

	function handleItemClick({ id, event, _ }: any) {
		event.stopPropagation();

		switch (id) {
			case "open":
				invoke("show_path_in_file_manager", { path: props.project.path });
				break;
			case "remove":
				invoke("remove_project", { path: props.project.path }).then(() => {
					loadProjects();
				});
				break;
		}
	}

	function openProject() {
		invoke("open_project", {
			projectPath: props.project.path,
			editorVersion: props.project.version,
		});
	}

	return (
		<div
			className="flex flex-row gap-4 flex-grow rounded-md p-4  hover:bg-stone-700 transition-colors cursor-pointer"
			onClick={openProject}
		>
			{/* Name */}
			<div className="w-4/5">
				<p className="overflow-ellipsis whitespace-nowrap overflow-x-clip text-stone-50">
					{props.project.name}
				</p>
				<p className="text-sm overflow-ellipsis whitespace-nowrap overflow-x-clip">
					{props.project.path}
				</p>
			</div>

			{/* Editor Version */}
			<div className="flex items-center justify-end  ml-auto">
				<p className="overflow-ellipsis whitespace-nowrap overflow-x-clip text-md">
					{props.project.version}
				</p>
			</div>

			<button
				className="flex items-center justify-center w-12 h-12 aspect-square rounded-md text-stone-50 hover:bg-stone-500"
				onClick={openOptions}
			>
				<EllipsisVertical width={20} height={20} />
			</button>

			<Menu id={"project-" + props.project.path} theme="dark_custom">
				<Item id="open" onClick={handleItemClick}>
					Show in Exporer
				</Item>
				<Separator />
				<Item id="remove" onClick={handleItemClick}>
					Remove
				</Item>
			</Menu>
		</div>
	);
}
