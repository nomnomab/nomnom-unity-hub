import { ButtonHTMLAttributes, useContext } from "react";
import { Context } from "../context/global-context";

export default function MainSidebar() {
	// async function getPath() {
	// 	console.log("test");
	// 	let path = await invoke("get_config_path", {});
	// 	console.log("path:", path);
	// 	window.alert(path);
	// }
	return (
		<div className="w-48 flex-shrink-0 h-screen bg-stone-800 flex flex-col border-r border-r-stone-700">
			{/* <UserHeader />
			<div className="divider my-4" /> */}
			<div className="my-2" />
			<Options />
			{/* <div className="mt-auto" /> */}
			{/* <div className="divider my-4" />
			<Footer /> */}
			{/* <button onClick={getPath}>Get Path</button> */}
		</div>
	);
}

function UserHeader() {
	return (
		<div className="h-14 py-4 flex-col">
			<div className="flex flex-row px-4">
				<div className="rounded-full p-2 bg-sky-600 w-9 h-9 flex justify-center items-center">
					<span className="text-center text-sm">AB</span>
				</div>
			</div>
		</div>
	);
}

function Options() {
	const { state, dispatch } = useContext(Context);
	return (
		<div className="px-4 gap-3 flex flex-col">
			<OptionItem
				title="Projects"
				selected={state.currentTab === "projects"}
				onClick={() => dispatch({ type: "change_tab", tab: "projects" })}
			/>
			<OptionItem
				title="Editors"
				selected={state.currentTab === "editors"}
				onClick={() => dispatch({ type: "change_tab", tab: "editors" })}
			/>
		</div>
	);
}

type OptionItemProps = {
	icon?: string;
	title: string;
	selected?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function OptionItem(props: OptionItemProps) {
	if (props.selected) {
		return (
			<span
				{...props}
				className="bg-stone-700 px-3 py-2 rounded-md text-stone-50 cursor-pointer"
			>
				{props.title}
			</span>
		);
	}
	return (
		<span {...props} className="px-3 py-2 rounded-md cursor-pointer">
			{props.title}
		</span>
	);
}

function Footer() {
	return (
		<div className="flex-col">
			<div className="flex flex-row px-4">
				<OptionItem title="Downloads" />
			</div>
		</div>
	);
}
