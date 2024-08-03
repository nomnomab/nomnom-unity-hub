import { useContext, useEffect, useState } from "react";
import { Context, Editor, EditorModule } from "../context/global-context";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/shell";
import { convertBytes, groupBy } from "../utils";
import EllipsisVertical from "./svg/ellipsis-vertical";
import { Menu, Item, TriggerEvent, useContextMenu } from "react-contexify";

const formatter = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 2,
});

export default function EditorsView() {
	const { state } = useContext(Context);
	useEffect(() => {
		state.getEditors();
	}, []);

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
			<div className="flex flex-row w-full max-w-6xl px-8 py-8 items-center">
				<div className="text-stone-50 flex flex-row items-center">
					<h1 className="select-none">Editors</h1>
					{state.editors.length > 0 && (
						<h4 className="text-stone-500 text-lg ml-2 leading-none select-none">
							({state.editors.length})
						</h4>
					)}
				</div>
				<div className="ml-auto" />
				{/* <button className="rounded-md bg-stone-700 px-3 py-1">Locate</button> */}
				<button className="rounded-md text-stone-50 bg-sky-600 px-3 py-1 ml-3 select-none">
					Install
				</button>
			</div>
		</div>
	);
}

function Installs() {
	const { state, dispatch } = useContext(Context);
	const [currentGroup, setCurrentGroup] = useState<string>("");
	const [groups, setGroups] = useState<
		{
			key: string;
			values: Editor[];
		}[]
	>([]);

	const [calculatingEditorSize, setCalculatingEditorSize] = useState(true);

	useEffect(() => {
		const calc = async () => {
			for (let i = 0; i < groups.length; i++) {
				const editors = groups[i].values;
				for (let j = 0; j < editors.length; j++) {
					const editor = editors[j];
					if (editor.sizeMb !== undefined) continue;

					setCalculatingEditorSize(true);

					try {
						const size: number = await invoke("calculate_editor_disk_size", {
							editorPath: editor.path,
						});

						// dispatch({ type: "set_editor_size", editor, sizeMb: size });
						editor.sizeMb = size;
					} catch (error) {
						console.error(error);
					}

					break;
				}
			}

			await new Promise((resolve) => setTimeout(resolve, 200));
			setCalculatingEditorSize(false);
		};

		calc();
	}, [, calculatingEditorSize]);

	useEffect(() => getGroups(), [state]);

	function getGroups() {
		const groups = groupBy(state.editors, (x) => x.version.split(".")[0]);
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

		if (filledGroups.length > 0) {
			setCurrentGroup(filledGroups[0].key);
		}
	}

	const selectedGroup = groups.find((x) => x.key === currentGroup);
	if (!selectedGroup) {
		return null;
	}

	const selectedGroupSize = selectedGroup.values
		.map((x) => x.sizeMb ?? 0)
		.reduce((a, b) => a + b);

	return (
		<>
			<div className="w-full max-w-6xl self-center h-full flex overflow-hidden">
				<div className="flex flex-col gap-4 border-r py-4 border-r-stone-700 w-32 flex-shrink-0 overflow-y-auto">
					{groups.map((i) => (
						<button
							key={i.key}
							className={`text-stone-50 text-sm px-3 py-3 hover:bg-stone-700 transition-colors select-none ${
								currentGroup === i.key ? "bg-stone-700" : ""
							}`}
							onClick={() => setCurrentGroup(i.key)}
						>
							{i.key}
						</button>
					))}
				</div>

				<div className="flex flex-col p-8 gap-4 w-full overflow-y-auto">
					<div className="flex justify-between">
						<p className="text-stone-200 text-sm">
							{selectedGroup.values.length} editor
							{selectedGroup.values.length > 1 ||
							selectedGroup.values.length === 0
								? "s"
								: ""}
						</p>

						<p className="text-stone-200 text-sm">
							{!selectedGroupSize || selectedGroupSize === 0
								? "- MB"
								: convertBytes(selectedGroupSize, {
										useBinaryUnits: true,
										decimals: 2,
								  })}
						</p>
					</div>
					{selectedGroup.values.map((x) => (
						<Install key={x.path + x.version} data={x} />
					))}
				</div>
			</div>
		</>
	);
}

function Install(props: { data: Editor }) {
	const { show, hideAll } = useContextMenu({
		id: "editor-" + props.data.path,
	});
	const [groups, setGroups] = useState<
		{
			key: string;
			values: EditorModule[];
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

	function openOptions(event: TriggerEvent) {
		event.stopPropagation();
		show({
			id: "editor-" + props.data.path,
			event,
			props: {},
		});
	}

	const trimmedF1Version = props.data.version.endsWith("f1")
		? props.data.version.slice(0, -2)
		: props.data.version;
	const url = `https://unity.com/releases/editor/whats-new/${trimmedF1Version}`;

	function openUrl() {
		open(url);
	}

	function handleItemClick({ id, event, _ }: any) {
		event.stopPropagation();
		hideAll();

		switch (id) {
			case "open":
				invoke("show_path_in_file_manager", { path: props.data.path });
				break;
			case "changelog":
				openUrl();
				break;
		}
	}

	return (
		<div className="flex flex-col px-4 py-3 bg-stone-900 rounded-md border border-stone-600">
			<div className="flex">
				<p className="text-stone-50">
					{/* Unity{" "} */}
					<p
						className="inline select-none cursor-pointer underline underline-offset-4 decoration-stone-500"
						onClick={openUrl}
					>
						{props.data.version}
					</p>
				</p>
				<button
					className="ml-auto flex items-center justify-center w-[30px] h-[30px] aspect-square rounded-md text-stone-50 hover:bg-stone-500"
					onClick={openOptions}
				>
					<EllipsisVertical width={20} height={20} />
				</button>
			</div>
			<p className="text-sm text-stone-500 select-none">{props.data.path}</p>
			<p className="text-sm text-stone-500 select-none">
				{!props.data.sizeMb && <span>- MB</span>}
				{props.data.sizeMb &&
					convertBytes(props.data.sizeMb, {
						useBinaryUnits: true,
						decimals: 2,
					})}
			</p>
			<div className={`flex flex-col gap-5 ${groups.length > 0 && "mt-4"}`}>
				{groups.map((g) => (
					<div key={g.key}>
						<p className="mb-1 text-stone-50 select-none">{g.key}</p>

						<div className="flex flex-row gap-2 flex-wrap">
							{g.values.map((x) => (
								<p
									key={x.name}
									className="rounded-md px-3 py-1 border border-stone-600 text-sm select-none"
								>
									{x.id}
								</p>
							))}
						</div>
					</div>
				))}
			</div>

			<Menu id={"editor-" + props.data.path} theme="dark_custom">
				<Item id="open" onClick={handleItemClick}>
					Show in Exporer
				</Item>
				<Item id="changelog" onClick={handleItemClick}>
					Open Changelog
				</Item>
			</Menu>
		</div>
	);
}
