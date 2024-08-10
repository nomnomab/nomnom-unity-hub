import useBetterState from "../../hooks/useBetterState";
import SettingsView from "../settings/settings-view";
import { Nav } from "./first-boot";

export default function StagePaths(props: { nav: Nav }) {
  const isBad = useBetterState(false);

  return (
    <div className="px-10 py-8 bg-stone-900 border border-stone-600 rounded-md gap-4 select-none max-h-[90%] overflow-y-auto">
      <p className="text-center max-w-xl">
        Let's set up some required settings real quick!
      </p>

      <SettingsView noHeader onBadPref={(x) => isBad.set(x)} />

      <div className="flex justify-center">
        <button
          className="rounded-md bg-sky-600 text-stone-50 px-4 py-2 mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={props.nav.advance}
          disabled={isBad.value}
        >
          {isBad.value && "Bad paths!"}
          {!isBad.value && "Done"}
        </button>
      </div>
    </div>
  );
}
