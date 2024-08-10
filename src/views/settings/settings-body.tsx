import { useContext, useEffect, useMemo } from "react";
import {
  ValidateInputContext,
  ValidateInputWithButton,
} from "../../components/validate-input";
import useBetterState from "../../hooks/useBetterState";
import { GlobalContext } from "../../context/global-context";
import FolderOpen from "../../components/svg/folder-open";
import { TauriTypes } from "../../utils/tauri-types";
import { LazyValue, UseState } from "../../utils";
import AsyncLazyValueComponent from "../../components/async-lazy-value-component";
import LoadingSpinner from "../../components/svg/loading-spinner";
import { TauriRouter } from "../../utils/tauri-router";
import { open } from "@tauri-apps/api/dialog";

export default function SettingsBody(props: {
  overrideClassName?: string;
  onBadPref?: (bad: boolean) => void;
}) {
  const lazyPrefs = useBetterState<LazyValue<TauriTypes.Prefs>>({
    status: "loading",
    value: null,
  });

  useEffect(() => {
    props.onBadPref?.(true);

    const load = async () => {
      const prefs = await TauriRouter.get_prefs();
      lazyPrefs.set({ status: "success", value: prefs });
      props.onBadPref?.(false);
    };

    load();
  }, []);

  return (
    <div className={props.overrideClassName ?? "flex flex-col px-8 py-4 gap-4"}>
      <ValidateInputContext.User>
        <AsyncLazyValueComponent
          loading={<LoadingSpinner />}
          value={lazyPrefs.value}
        >
          {lazyPrefs && (
            <Inputs lazyPrefs={lazyPrefs} onBadPref={props.onBadPref} />
          )}
        </AsyncLazyValueComponent>
      </ValidateInputContext.User>
    </div>
  );
}

function Inputs({
  lazyPrefs,
  onBadPref,
}: {
  lazyPrefs: UseState<LazyValue<TauriTypes.Prefs>>;
  onBadPref?: (bad: boolean) => void;
}) {
  const validInputContext = useContext(ValidateInputContext.Context);

  const prefs = useMemo(() => {
    return lazyPrefs.value?.value;
  }, [lazyPrefs.value]);

  if (!prefs) {
    return null;
  }

  function savePrefs() {
    if (!prefs) return;
    TauriRouter.set_prefs(prefs);
  }

  function setPrefs(prefs: TauriTypes.Prefs) {
    lazyPrefs.set({ ...lazyPrefs.value, value: prefs });
  }

  async function selectProjectFolder(key: string) {
    const path = await open({
      directory: true,
      multiple: false,
      // @ts-ignore
      defaultPath: prefs[key],
    });

    if (!path) return;
    setPrefs({ ...prefs, [key]: path as string });
  }

  function checkPath(key: string): Promise<boolean> {
    try {
      // @ts-ignore
      return ValidateInputContext.isBadPath(prefs[key]).then((err) => {
        validInputContext.dispatch({
          type: "set_error",
          key: key,
          value: err,
        });
        return err !== null;
      });
    } catch (err) {
      console.error(err);
    }

    return Promise.resolve(false);
  }

  useEffect(() => {
    checkPath("newProjectPath");
    checkPath("hubPath");
    checkPath("hubEditorsPath");
    checkPath("hubAppdataPath");
  }, [
    prefs.newProjectPath,
    prefs.hubPath,
    prefs.hubEditorsPath,
    prefs.hubAppdataPath,
  ]);

  useEffect(() => {
    const anyError = Object.values(validInputContext.state.hasError).some(
      (v) => v
    );
    onBadPref?.(anyError);
  }, [validInputContext.state]);

  return (
    <>
      <ValidateInputWithButton
        label="New Project Path"
        subtitle="The default path that the project creator will use as its root folder."
        name="newProjectPath"
        value={prefs.newProjectPath ?? ""}
        hasError={() =>
          ValidateInputContext.isEmptyString(prefs.newProjectPath) ||
          validInputContext.state.hasError["newProjectPath"]
        }
        onChange={(e) => setPrefs({ ...prefs, newProjectPath: e.target.value })}
        onBlur={savePrefs}
        className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
        divProps={{
          className: "flex-grow",
        }}
      >
        <button
          className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
          onClick={() => selectProjectFolder("newProjectPath")}
        >
          <FolderOpen />
        </button>
      </ValidateInputWithButton>

      <ValidateInputWithButton
        label="Unity Hub Path"
        subtitle="The path to the Unity Hub executable."
        name="hubPath"
        value={prefs.hubPath ?? ""}
        hasError={() =>
          ValidateInputContext.isEmptyString(prefs.hubPath) ||
          validInputContext.state.hasError["hubPath"]
        }
        onChange={(e) => setPrefs({ ...prefs, hubPath: e.target.value })}
        onBlur={savePrefs}
        className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
        divProps={{
          className: "flex-grow",
        }}
      >
        <button
          className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
          onClick={() => selectProjectFolder("hubPath")}
        >
          <FolderOpen />
        </button>
      </ValidateInputWithButton>

      <ValidateInputWithButton
        label="Unity Hub Editors Path"
        subtitle="The path to the Unity Hub Editors folder."
        name="hubEditorsPath"
        value={prefs.hubEditorsPath ?? ""}
        hasError={() =>
          ValidateInputContext.isEmptyString(prefs.hubEditorsPath) ||
          validInputContext.state.hasError["hubEditorsPath"]
        }
        onChange={(e) => setPrefs({ ...prefs, hubEditorsPath: e.target.value })}
        onBlur={savePrefs}
        className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
        divProps={{
          className: "flex-grow",
        }}
      >
        <button
          className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
          onClick={() => selectProjectFolder("hubEditorsPath")}
        >
          <FolderOpen />
        </button>
      </ValidateInputWithButton>

      <ValidateInputWithButton
        label="Unity Hub Appdata Path"
        subtitle="The path to the Unity Hub Appdata folder."
        name="hubAppdataPath"
        hasError={() =>
          ValidateInputContext.isEmptyString(prefs.hubAppdataPath) ||
          validInputContext.state.hasError["hubAppdataPath"]
        }
        value={prefs.hubAppdataPath ?? ""}
        onChange={(e) => setPrefs({ ...prefs, hubAppdataPath: e.target.value })}
        onBlur={savePrefs}
        className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
        divProps={{
          className: "flex-grow",
        }}
      >
        <button
          className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
          onClick={() => selectProjectFolder("hubAppdataPath")}
        >
          <FolderOpen />
        </button>
      </ValidateInputWithButton>
    </>
  );
}
