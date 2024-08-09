import useBetterState from "../../hooks/useBetterState";
import { Buttons } from "../../components/parts/buttons";
import BasicInfoView from "./basic-info-view";
import PackageView from "./package-view";
import TemplateView from "./template-view";
import { useContext } from "react";
import { GlobalContext } from "../../context/global-context";
import { NewProjectContext } from "../../context/new-project-context";
import FilesView from "./files-view";

export type NewProjectData = {
  projectName: string;
  projectPath: string;
};

// const tabs = [
//   { id: "template", title: "Template" },
//   { id: "packages", title: "Packages" },
//   { id: "basic-info", title: "Basic Info" },
// ];

export default function NewProjectBody() {
  const globalContext = useContext(GlobalContext.Context);
  const newProjectContext = useContext(NewProjectContext.Context);

  const hasFieldError = useBetterState(false);
  const data = useBetterState({
    projectName: "New Project",
    projectPath: "",
  });

  function gotoPreviousTab() {
    const selectedTab = newProjectContext.state.tab;
    if (!NewProjectContext.onFirstTab(selectedTab)) {
      newProjectContext.dispatch({
        type: "change_tab",
        tab: NewProjectContext.getPreviousTab(selectedTab)!,
      });
    } else {
      globalContext.dispatch({ type: "change_tab", tab: "projects" });
    }
  }

  function gotoNextTab() {
    const selectedTab = newProjectContext.state.tab;
    if (!NewProjectContext.onLastTab(selectedTab)) {
      newProjectContext.dispatch({
        type: "change_tab",
        tab: NewProjectContext.getNextTab(selectedTab)!,
      });
    }
  }

  const selectedTab = newProjectContext.state.tab;
  const onFirstTab = NewProjectContext.onFirstTab(selectedTab);
  const onLastTab = NewProjectContext.onLastTab(selectedTab);

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex flex-col px-4 overflow-hidden"
        style={{ height: "calc(100% - 48px)" }}
      >
        {selectedTab === "template" && <TemplateView />}
        {selectedTab === "package" && <PackageView />}
        {selectedTab === "files" && <FilesView />}
        {selectedTab === "info" && (
          <BasicInfoView data={data} hasFieldError={hasFieldError} />
        )}
      </div>
      <div className="flex flex-row justify-between p-4 border-t border-t-stone-700 relative">
        {selectedTab === "package" && (
          <div className="flex absolute w-full items-center justify-center select-none pointer-events-none top-0 bottom-0">
            <p className="text-center text-stone-400 text-sm leading-0">
              {newProjectContext.state.initialTemplateInfo.selectedTemplate
                ?.name ?? "empty template"}
            </p>
          </div>
        )}

        <Buttons.DefaultButton
          title={onFirstTab ? "Cancel" : "Back"}
          onClick={gotoPreviousTab}
        />

        <div className="flex gap-1">
          {onLastTab && (
            <Buttons.DefaultButton
              title="Save As Template"
              disabled={
                hasFieldError.value ||
                newProjectContext.state.error.status === "error"
              }
            />
          )}

          <Buttons.ActionButton
            title={onLastTab ? "Create Project" : "Next"}
            disabled={
              hasFieldError.value ||
              newProjectContext.state.error.status === "error"
            }
            onClick={gotoNextTab}
          />
        </div>
      </div>
    </div>
  );
}
