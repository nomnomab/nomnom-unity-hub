import { open } from "@tauri-apps/api/shell";
import { invoke } from "@tauri-apps/api/tauri";
import { PropsWithChildren, useContext, useEffect, useState } from "react";
import Popup from "reactjs-popup";
import SettingsView from "./settings-view";
import { Context } from "../context/global-context";

export default function FirstTimeBoot(props: PropsWithChildren) {
	const [firstBoot, setFirstBoot] = useState(false);
	const [stage, setStage] = useState<"intro" | "paths">("intro");

	useEffect(() => {
		invoke("is_first_boot").then((x) => setFirstBoot(x as boolean));
		// setFirstBoot(true);
	}, []);

	if (!firstBoot) {
		return props.children;
	}

	function flagFirstBoot() {
		invoke("set_past_first_boot");
		setFirstBoot(false);
	}

	return (
		<>
			<div>{props.children}</div>
			{stage === "intro" && <StageIntro advance={() => setStage("paths")} />}
			{stage === "paths" && <StagePaths advance={flagFirstBoot} />}
		</>
	);
}

function StageIntro({ advance }: { advance: () => void }) {
	return (
		<Popup position="center center" modal open>
			<div className="bg-[#0c0a09b4] fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center">
				<div className="px-8 py-6 flex flex-col items-center justify-center bg-stone-900 border border-stone-600 rounded-md gap-4 select-none">
					<p className="text-center">Hello 👋</p>
					<p className="max-w-xl">
						Thanks for trying out my custom unity hub. This tool is meant to be
						a sort of "companion" app to the regular hub.
					</p>
					<p className="max-w-xl">
						Things such as editor installs, editor removals, official template
						downloads, user account handling, and the rest of that jazz will
						still have to be done via the Unity Hub.
					</p>
					<p className="max-w-xl">
						If you have any suggestions or issues, please let me know in the{" "}
						<span
							className="cursor-pointer text-sky-600 hover:text-sky-400 hover:underline underline-offset-4"
							onClick={() => {
								open("https://github.com/nomnomab/nomnom-unity-hub/issues");
							}}
						>
							github issues!
						</span>
					</p>
					<button
						className="rounded-md bg-sky-600 text-stone-50 px-4 py-2 mt-2"
						onClick={advance}
					>
						Sounds Good
					</button>
				</div>
			</div>
		</Popup>
	);
}

function StagePaths({ advance }: { advance: () => void }) {
	const { state } = useContext(Context);

	return (
		<Popup position="center center" modal open>
			<div className="bg-[#0c0a09b4] fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center">
				<div className="px-8 py-6 flex flex-col items-center justify-center bg-stone-900 border border-stone-600 rounded-md gap-4 select-none flex-grow max-w-3xl max-h-[80%]">
					<p className="text-center max-w-xl">
						Let's set up some settings real quick!
					</p>

					<p className="text-center max-w-xl">
						These paths allow the hub to locate your editor, templates, and
						various settings.
					</p>

					<SettingsView
						overrideClassName="w-full overflow-y-auto gap-4"
						noHeader
					/>

					<button
						className="rounded-md bg-sky-600 text-stone-50 px-4 py-2 mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
						onClick={advance}
						disabled={state.hasBadPref}
					>
						Done
					</button>
				</div>
			</div>
		</Popup>
	);
}
