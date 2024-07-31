import { useContext, useEffect, useState } from "react";
import {
	Context,
	EditorInstall,
	InstallModule,
} from "../context/global-context";
import { invoke } from "@tauri-apps/api/tauri";
import { groupBy } from "../utils";
import EllipsisVertical from "./svg/ellipsis-vertical";

export default function InstallsView() {
	const { dispatch } = useContext(Context);
	useEffect(() => {
		loadEditorInstalls();
	}, []);

	async function loadEditorInstalls() {
		const results: EditorInstall[] = await invoke("get_editor_installs");
		dispatch({ type: "set_installs", installs: results });
	}

	return (
		<div className="flex flex-col w-full">
			<Header />
			<Installs />
		</div>
	);
}

function Header() {
	const { state } = useContext(Context);
	return (
		<div className="flex flex-row border-b border-b-stone-700 justify-center">
			<div className="flex flex-row w-full max-w-6xl px-12 py-8 items-center">
				<div className="text-stone-50 flex flex-row items-center">
					<h1>Editors</h1>
					{state.installs.length > 0 && (
						<h4 className="text-stone-500 text-lg ml-2 leading-none">
							({state.installs.length})
						</h4>
					)}
				</div>
				<div className="ml-auto" />
				{/* <button className="rounded-md bg-stone-700 px-3 py-1">Locate</button> */}
				<button className="rounded-md text-stone-50 bg-sky-600 px-3 py-1 ml-3">
					Install
				</button>
			</div>
		</div>
	);
}

function Installs() {
	const { state } = useContext(Context);
	const [groups, setGroups] = useState<
		{
			key: string;
			values: EditorInstall[];
		}[]
	>([]);

	useEffect(() => getGroups(), []);

	function getGroups() {
		const groups = groupBy(state.installs, (x) => x.version.split(".")[0]);
		const keys = Object.keys(groups);

		const filledGroups = keys
			.map((x) => {
				return {
					key: x,
					values: groups[x],
				};
			})
			.reverse();
		setGroups(filledGroups);
	}

	return (
		<>
			<div className="w-full max-w-6xl self-center overflow-y-auto h-full">
				<div className="flex flex-col p-8 gap-4">
					{/* {state.installs.map((i) => (
						<Install key={i.version} data={i} />
					))} */}
					{groups.map((i) => (
						<>
							<h4 key={i.key}>{i.key}</h4>
							{i.values.map((x) => (
								<Install key={x.version} data={x} />
							))}
						</>
					))}
				</div>
			</div>
		</>
	);
}

function Install(props: { data: EditorInstall }) {
	const [groups, setGroups] = useState<
		{
			key: string;
			values: InstallModule[];
		}[]
	>([]);

	useEffect(() => getGroups(), []);

	function getGroups() {
		const groups = groupBy(props.data.modules, (x) => x.category);
		const keys = Object.keys(groups);

		// get proper groups
		const filledKeys = keys.filter(
			(x) => groups[x].filter((x) => x.visible && x.selected).length > 0
		);

		const filledGroups = filledKeys.map((x) => {
			return {
				key: x,
				values: groups[x].filter((x) => x.visible && x.selected),
			};
		});
		setGroups(filledGroups);
	}

	return (
		<div className="flex flex-col px-4 py-3 bg-stone-900 rounded-md border border-stone-600">
			<div className="flex">
				<p className="text-stone-50">
					{/* Unity{" "} */}
					<span className="inline">{props.data.version}</span>
				</p>
				<button className="ml-auto flex items-center justify-center w-[30px] h-[30px] aspect-square rounded-md text-stone-50 hover:bg-stone-500">
					<EllipsisVertical width={20} height={20} />
				</button>
			</div>
			<p className={`text-sm text-stone-500 ${groups.length > 0 && "mb-4"}`}>
				{props.data.path}
			</p>
			<div className="flex flex-col gap-5">
				{groups.map((g) => (
					<div key={g.key}>
						<p className="mb-1 text-stone-50">{g.key}</p>

						<div className="flex flex-row gap-2 flex-wrap">
							{g.values.map((x) => (
								<p
									key={x.name}
									className="rounded-md px-3 py-1 border border-stone-600 text-sm"
								>
									{x.id}
								</p>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
