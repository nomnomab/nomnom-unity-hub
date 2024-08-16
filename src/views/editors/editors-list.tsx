import { useCallback, useContext, useEffect, useMemo } from "react";
import useBetterState from "../../hooks/useBetterState";
import { TauriTypes } from "../../utils/tauri-types";
import { TauriRouter } from "../../utils/tauri-router";
import AsyncComponent from "../../components/async-component";
import LoadingSpinner from "../../components/svg/loading-spinner";
import EllipsisVertical from "../../components/svg/ellipsis-vertical";
import { open } from "@tauri-apps/api/shell";
import { Menu, Item, useContextMenu, TriggerEvent } from "react-contexify";
import { convertBytes, groupBy } from "../../utils";
import AsyncLazyValueComponent from "../../components/async-lazy-value-component";
import { GlobalContext } from "../../context/global-context";

interface UnityEditorInstallGroup {
  version: string;
  editors: TauriTypes.UnityEditorInstall[];
}

interface EditorListData {
  selectedGroup: string;
  editorGroups: UnityEditorInstallGroup[];
}

export default function EditorsList() {
  const globalContext = useContext(GlobalContext.Context);
  const data = useBetterState<EditorListData>({
    selectedGroup: "",
    editorGroups: [],
  });

  const loadEditors = useCallback(async () => {
    // await new Promise((resolve) => setTimeout(resolve, 1000));
    const editors = await TauriRouter.get_editors();

    // split editors into groups by their root version
    const groups = groupBy(editors, (x) => x.version.split(".")[0]);
    const keys = Object.keys(groups);
    const filledGroups = keys
      .map((x) => {
        return {
          version: x,
          editors: groups[x],
        };
      })
      .reverse();

    if (filledGroups.length === 0) {
      data.set((s) => ({ ...s, selectedGroup: "", editorGroups: [] }));
      return;
    }

    data.set((s) => ({
      ...s,
      selectedGroup: filledGroups[0].version,
      editorGroups: filledGroups,
    }));
  }, []);

  const selectedGroup = useMemo(() => {
    return (
      data.value.editorGroups.find(
        (x) => x.version === data.value.selectedGroup
      ) ?? null
    );
  }, [data.value.selectedGroup]);

  const calculatingEditorSize = useBetterState(true);
  useEffect(() => {
    const calculateDiskSizes = async () => {
      for (let i = 0; i < data.value.editorGroups.length; i++) {
        const editors = data.value.editorGroups[i].editors;
        for (let j = 0; j < editors.length; j++) {
          const editor = editors[j];
          if (
            editor.diskSize !== undefined &&
            editor.diskSize?.status === "success"
          ) {
            continue;
          }

          try {
            editor.diskSize = {
              status: "loading",
              value: 0,
            };

            const size = await TauriRouter.estimate_editor_size(editor.version);
            console.log("size:", size);
            editor.diskSize = {
              status: "success",
              value: size,
            };

            data.set((s) => ({
              ...s,
              editorGroups: [...s.editorGroups],
            }));
          } catch (e) {
            console.error(e);
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      calculatingEditorSize.set(false);
      console.log("calculatingEditorSize:", calculatingEditorSize.value);
    };

    calculateDiskSizes();
  }, [calculatingEditorSize]);

  return (
    <>
      <AsyncComponent
        loading={
          <div className="w-full h-full flex items-center justify-center animate-pulse transition-all">
            <LoadingSpinner />
          </div>
        }
        callback={loadEditors}
        error={(err) => {
          if (!err) return null;
          if ((err as string) && err === "Invalid hub_editors_path") {
            return (
              <div className="p-6">
                <p>An invalid hub editor path was assigned.</p>
                <p>
                  Please head over to the{" "}
                  <span
                    className="underline underline-offset-2 text-sky-600 cursor-pointer select-none"
                    onClick={() =>
                      globalContext.dispatch({
                        type: "change_tab",
                        tab: "settings",
                      })
                    }
                  >
                    settings
                  </span>{" "}
                  to assign a new one!
                </p>
              </div>
            );
          }

          return <div className="p-6">{JSON.stringify(err)}</div>;
        }}
      >
        <div className="flex h-full">
          <div className="flex flex-col gap-4 border-r px-4 py-4 border-r-stone-700 w-32 flex-shrink-0 overflow-y-auto">
            {data.value.editorGroups.map((x) => (
              <button
                key={x.version}
                className={`${
                  x.version === data.value.selectedGroup
                    ? "bg-sky-600 border-stone-900 hover:bg-sky-700"
                    : "border-stone-600 hover:bg-stone-800"
                } px-6 py-3 text-stone-50 text-sm font-medium rounded-md border`}
                onClick={() =>
                  data.set((s) => ({ ...s, selectedGroup: x.version }))
                }
              >
                {x.version}
              </button>
            ))}
          </div>
          <div className="flex flex-col px-6 py-4 overflow-y-auto gap-4 w-full">
            {selectedGroup && (
              <EditorGroup
                key={selectedGroup.version}
                version={selectedGroup.version}
                editors={selectedGroup.editors}
              />
            )}
          </div>
        </div>
      </AsyncComponent>
    </>
  );
}

function EditorGroup({
  version,
  editors,
}: {
  version: string;
  editors: TauriTypes.UnityEditorInstall[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {editors.map((e) => (
        <Editor key={e.exePath} editor={e} />
      ))}
    </div>
  );
}

function Editor({ editor }: { editor: TauriTypes.UnityEditorInstall }) {
  const docsUrl = useMemo(() => {
    const trimmedF1Version = editor.version.endsWith("f1")
      ? editor.version.slice(0, -2)
      : editor.version;
    return `https://unity.com/releases/editor/whats-new/${trimmedF1Version}`;
  }, []);

  const { show, hideAll } = useContextMenu({});
  const projectSettingsFoldoutOpen = useBetterState(false);

  function openOptions(event: TriggerEvent) {
    event.stopPropagation();
    show({
      id: "editor-" + editor.exePath,
      event,
      props: {},
    });
  }

  function handleItemClick({ id, event, _ }: any) {
    event.stopPropagation();
    hideAll();

    switch (id) {
      case "open":
        TauriRouter.show_path_in_file_manager(editor.exePath);
        break;
      case "changelog":
        open(docsUrl);
        break;
    }
  }

  const getModuleGroups = useCallback(() => {
    const groups = groupBy(editor.modules, (x) => x.category);
    const keys = Object.keys(groups);

    // get proper groups
    const filledKeys = keys.filter(
      (x) => groups[x].filter((x) => x.visible && x.selected).length > 0
    );

    if (filledKeys.length === 0) {
      return [];
    }

    const filledGroups = filledKeys.map((x) => {
      return {
        key: x,
        values: groups[x].filter((x) => x.visible && x.selected),
      };
    });

    return filledGroups;
  }, [editor]);

  return (
    <div className="flex flex-col px-4 py-3 bg-stone-900 rounded-md border border-stone-600">
      <div className="flex">
        <p className="text-stone-50">
          <span
            className="inline select-none cursor-pointer underline underline-offset-4 decoration-stone-500"
            onClick={() => open(docsUrl)}
            title={docsUrl}
          >
            {editor.version}
          </span>
        </p>
        <button
          className="ml-auto flex items-center justify-center w-[30px] h-[30px] aspect-square rounded-md text-stone-50 hover:bg-stone-500"
          onClick={openOptions}
        >
          <EllipsisVertical width={20} height={20} />
        </button>
      </div>
      <p className="text-sm text-stone-500 select-none">{editor.exePath}</p>
      <span className="text-sm text-stone-500 select-none">
        <AsyncLazyValueComponent
          loading={<LoadingSpinner width={18} height={18} />}
          value={editor.diskSize}
        >
          {(editor.diskSize?.value ?? 0) === 0 && <span>??? MB</span>}
          {(editor.diskSize?.value ?? 0) > 0 &&
            convertBytes(editor.diskSize?.value ?? 0, {
              useBinaryUnits: true,
              decimals: 2,
            })}
        </AsyncLazyValueComponent>
      </span>

      {/* Modules */}
      {getModuleGroups().length > 0 && (
        <div className="flex flex-col gap-5 mt-4">
          {getModuleGroups().map((g) => (
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
      )}

      <Menu id={"editor-" + editor.exePath} theme="dark_custom">
        <Item id="open" onClick={handleItemClick}>
          Show in Explorer
        </Item>
        <Item id="changelog" onClick={handleItemClick}>
          Open Changelog
        </Item>
      </Menu>
    </div>
  );
}
