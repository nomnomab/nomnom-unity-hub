import { Item, Menu, TriggerEvent, useContextMenu } from "react-contexify";
import { Editor } from "../context/global-context";

type Props = {
	className?: string;
	version: string;
	versions: Editor[];
	onChange: (version: string) => void;
	style?: "link" | "button";
};
export default function EditorVersionSelect(props: Props) {
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

	function versionSelected({ id, event, _ }: any) {
		event.stopPropagation();
		props.onChange(id);
	}

	const className =
		(props.style ?? "link") === "link"
			? (props.className ?? "") +
			  " text-stone-200 underline underline-offset-4 decoration-stone-600"
			: (props.className ?? "") + " ";
	return (
		<>
			<button className={className} onClick={openOptions}>
				{props.version}
			</button>
			<Menu
				id="editor_version"
				className="overflow-y-auto max-h-64"
				theme="dark_custom"
			>
				{props.versions.map((x) => (
					<Item
						key={x.path}
						id={x.version}
						onClick={versionSelected}
						className={
							x.version === props.version ? "bg-sky-600 rounded-md" : ""
						}
					>
						{x.version}
					</Item>
				))}
			</Menu>
		</>
	);
}
