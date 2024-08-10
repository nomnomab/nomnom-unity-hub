import { useContext, useEffect, useMemo } from "react";
import AsyncLazyValueComponent from "../../components/async-lazy-value-component";
import EditorVersionSelect from "../../components/editor-version-select";
import LoadingSpinner from "../../components/svg/loading-spinner";
import ViewHeader from "../../components/view-header";
import useBetterState from "../../hooks/useBetterState";
import { LazyValue } from "../../utils";
import { TauriTypes } from "../../utils/tauri-types";
import { TauriRouter } from "../../utils/tauri-router";
import { NewProjectContext } from "../../context/new-project-context";

export default function NewProjectHeader() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const editors = useBetterState<LazyValue<TauriTypes.UnityEditorInstall[]>>({
    status: "loading",
    value: null,
  });

  const selectedVersion = useBetterState<string | null>(null);
  useEffect(() => {
    if (!selectedVersion.value) {
      return;
    }

    newProjectContext.dispatch({
      type: "set_editor_version",
      editor: editors.value!.value!.find(
        (e) => e.version === selectedVersion.value
      )!,
    });

    TauriRouter.set_user_cache_value(
      TauriTypes.UserCacheKey.LastEditorVersion,
      selectedVersion.value
    ).then(() => console.log("saved ", selectedVersion.value));
  }, [selectedVersion.value]);

  useEffect(() => {
    const load = async () => {
      editors.set({ status: "loading", value: null });
      const newEditors = await TauriRouter.get_editors();
      const userCache = await TauriRouter.get_user_cache();

      editors.set({ status: "success", value: newEditors });
      selectedVersion.set(
        newEditors.length === 0
          ? null
          : userCache.lastEditorVersion ?? newEditors[0].version
      );
    };
    load();
  }, []);

  return (
    <ViewHeader
      title={
        newProjectContext.state.tab === "new-template"
          ? "New Template"
          : "New Project"
      }
    >
      <div className="ml-auto" />
      {newProjectContext.state.tab === "template" && (
        <AsyncLazyValueComponent
          loading={<LoadingSpinner />}
          value={editors.value}
        >
          {selectedVersion.value && (
            <EditorVersionSelect
              version={selectedVersion.value}
              versions={editors.value?.value ?? []}
              onChange={selectedVersion.set}
            />
          )}
          {!selectedVersion.value && <p>No installs found</p>}
        </AsyncLazyValueComponent>
      )}
      {newProjectContext.state.tab !== "template" && (
        <p className="text-stone-200 select-none">{selectedVersion.value}</p>
      )}
    </ViewHeader>
  );
}
