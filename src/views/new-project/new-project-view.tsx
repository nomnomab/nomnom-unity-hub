import { useContext, useEffect } from "react";
import SectionView from "../../components/section-view";
import ViewBody from "../../components/view-body";
import { NewProjectContext } from "../../context/new-project-context";
import NewProjectBody from "./new-project-body";
import NewProjectHeader from "./new-project-header";
import useBetterState from "../../hooks/useBetterState";
import LoadingSpinner from "../../components/svg/loading-spinner";
import { TauriRouter } from "../../utils/tauri-router";

export default function NewProjectView() {
  return (
    <SectionView>
      <NewProjectContext.User>
        <Setup />
      </NewProjectContext.User>
    </SectionView>
  );
}

function Setup() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const isLoading = useBetterState(true);

  useEffect(() => {
    // load default information
    const load = async () => {
      const userCache = await TauriRouter.get_user_cache();
      const editors = await TauriRouter.get_editors();

      const lastEditor =
        editors.find(
          (editor) => editor.version === userCache.lastEditorVersion
        ) ?? editors[0];

      newProjectContext.dispatch({
        type: "set_editor_version",
        editor: lastEditor,
      });

      isLoading.set(false);
    };

    load();
  }, []);

  if (isLoading.value) {
    return (
      <div className="flex flex-grow items-center justify-center animate-pulse">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <NewProjectHeader />
      <ViewBody>
        <NewProjectBody />
      </ViewBody>
    </>
  );
}
