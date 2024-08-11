import { ButtonHTMLAttributes, useContext, useEffect } from "react";
import { open } from "@tauri-apps/api/shell";
import { GlobalContext } from "../context/global-context";
import { getVersion } from "@tauri-apps/api/app";
import useBetterState from "../hooks/useBetterState";
import { LazyValue } from "../utils";

export default function MainSidebar() {
  return (
    <div className="w-48 flex-shrink-0 h-screen bg-stone-800 flex flex-col border-r border-r-stone-700">
      <div className="my-2" />
      <Options />
    </div>
  );
}

function Options() {
  const globalContext = useContext(GlobalContext.Context);
  const appVersion = useBetterState<LazyValue<string>>({
    status: "loading",
    value: null,
  });

  useEffect(() => {
    getVersion()
      .then((v) => {
        appVersion.set({ status: "success", value: v });
      })
      .catch((e) => {
        appVersion.set({ status: "error", value: e.message });
      });
  }, []);

  return (
    <>
      <div className="px-4 gap-3 flex flex-col flex-grow pb-3">
        <OptionItem
          title="Projects"
          selected={globalContext.state.currentTab === "projects"}
          onClick={() =>
            globalContext.dispatch({ type: "change_tab", tab: "projects" })
          }
        />
        <OptionItem
          title="Editors"
          selected={globalContext.state.currentTab === "editors"}
          onClick={() =>
            globalContext.dispatch({ type: "change_tab", tab: "editors" })
          }
        />

        <OptionItem
          title="Settings"
          selected={globalContext.state.currentTab === "settings"}
          onClick={() =>
            globalContext.dispatch({ type: "change_tab", tab: "settings" })
          }
          className="mt-auto"
        />
      </div>
      <div className="px-4 gap-1 flex flex-col pb-3">
        <p className="text-sm text-stone-400 select-none px-3">
          <span className="text-xs">Made by</span> <br />
          <span
            className="text-stone-300 transition-colors hover:text-stone-50 hover:underline cursor-pointer"
            title="https://github.com/nomnomab"
            onClick={() => open("https://github.com/nomnomab")}
          >
            Andrew Burke
          </span>
        </p>

        <p className="text-xs text-stone-400 select-none px-3">
          v{appVersion.value.value ?? "???"}
        </p>
      </div>
    </>
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
        className={`bg-stone-600 px-3 py-2 rounded-md text-stone-50 cursor-pointer select-none hover:bg-stone-700 ${props.className}`}
        // className={`bg-sky-600 px-3 py-2 rounded-md text-stone-50 cursor-pointer select-none hover:bg-sky-700 ${props.className}`}
      >
        {props.title}
      </span>
    );
  }
  return (
    <span
      {...props}
      className={`px-3 py-2 rounded-md cursor-pointer select-none hover:bg-stone-700 hover:text-stone-50 ${props.className}`}
    >
      {props.title}
    </span>
  );
}
