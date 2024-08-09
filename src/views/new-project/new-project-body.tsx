import useBetterState from "../../hooks/useBetterState";
import { Buttons } from "../../components/parts/buttons";
import BasicInfoView from "./basic-info-view";
import PackageView from "./package-view";
import TemplateView from "./template-view";
import { useContext } from "react";
import { GlobalContext } from "../../context/global-context";
import { NewProjectContext } from "../../context/new-project-context";
import FilesView from "./files-view";
import { TauriRouter } from "../../utils/tauri-router";
import { TauriTypes } from "../../utils/tauri-types";
import Popup from "reactjs-popup";
import LoadingSpinner from "../../components/svg/loading-spinner";

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
  const isLoading = useBetterState(false);

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

  async function gotoNextTab() {
    const selectedTab = newProjectContext.state.tab;
    if (!NewProjectContext.onLastTab(selectedTab)) {
      newProjectContext.dispatch({
        type: "change_tab",
        tab: NewProjectContext.getNextTab(selectedTab)!,
      });
    } else {
      // create project
      const basicInfo = newProjectContext.state.basicInfo;
      const template = newProjectContext.state.initialTemplateInfo;
      const pack = newProjectContext.state.packageInfo;
      const files = newProjectContext.state.filesInfo;

      const packages = await TauriRouter.get_default_editor_packages(
        template.editorVersion.version
      );

      let paths: string[] = [];
      let rootMap = new Map<string, number>();

      function fileDirToPaths(fileDir: TauriTypes.FileDir, path: string) {
        if (path !== "" && !files.selectedFiles.includes(fileDir.id)) {
          return;
        }

        const isRoot = path === "";
        path += fileDir.name;

        if (!isRoot) {
          paths.push(path);

          const components = path.split("/");
          let part = "";
          components.forEach((component) => {
            part += (part !== "" ? "/" : "") + component;
            if (rootMap.has(part)) {
              rootMap.set(part, rootMap.get(part)! + 1);
            } else {
              rootMap.set(part, 1);
            }
          });
        }

        if (fileDir.children) {
          for (const child of fileDir.children) {
            fileDirToPaths(child, path + "/");
          }
        }
      }

      if (files.root) fileDirToPaths(files.root, "");

      const trimmedPaths = paths.filter((path) => rootMap.get(path) === 1);
      const templateInfo: TauriTypes.TemplateInfoForGeneration = {
        template: template.selectedTemplate,
        editorVersion: template.editorVersion,
        packages: packages.filter((x) =>
          pack.selectedPackages.includes(x.name)
        ),
        selectedFiles: trimmedPaths,
      };
      const projectInfo: TauriTypes.ProjectInfoForGeneration = {
        name: basicInfo.name,
        path: basicInfo.path,
      };

      isLoading.set(true);
      try {
        const output = await TauriRouter.generate_project(
          projectInfo,
          templateInfo
        );
        isLoading.set(false);

        console.log(output);

        await TauriRouter.add_project(output);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        globalContext.dispatch({ type: "change_tab", tab: "projects" });
      } catch (e) {
        console.error(e);
        isLoading.set(false);
      }
    }
  }

  const selectedTab = newProjectContext.state.tab;
  const onFirstTab = NewProjectContext.onFirstTab(selectedTab);
  const onLastTab = NewProjectContext.onLastTab(selectedTab);

  // if (isLoading.value) {
  //   <div className="flex flex-col h-full justify-end">
  //     <div className="flex flex-row justify-between p-4 border-t border-t-stone-700 relative">
  //       <LoadingSpinner />
  //     </div>
  //   </div>;
  // }

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
          <BasicInfoView hasFieldError={hasFieldError} />
        )}
      </div>
      <div className="flex flex-row justify-between p-4 border-t border-t-stone-700 relative">
        {(selectedTab === "package" || selectedTab === "files") && (
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
                true ||
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

      <Popup
        open={isLoading.value}
        position="center center"
        modal
        closeOnDocumentClick={false}
      >
        <div className="bg-[#000000aa] fixed left-0 right-0 top-0 bottom-0 w-full h-full flex items-center justify-center">
          <div className="bg-stone-900 border border-stone-600 outline-none w-full max-w-xl px-4 py-8 flex flex-col items-center">
            <p>Creating your project...</p>
            <p className="text-sm text-stone-400 pb-4">
              This might take a little bit
            </p>
            <LoadingSpinner />
          </div>
        </div>
      </Popup>
    </div>
  );
}
