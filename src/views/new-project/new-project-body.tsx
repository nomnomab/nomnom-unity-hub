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
import NewTemplateView from "./new-template-view";

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
    if (selectedTab === "new-template") {
      isLoading.set(true);

      // create template
      const initialTemplateInfo = newProjectContext.state.initialTemplateInfo;
      const pack = newProjectContext.state.packageInfo;
      const files = newProjectContext.state.filesInfo;
      const newTemplateInfo = newProjectContext.state.newTemplateInfo;

      const packages = await TauriRouter.get_default_editor_packages(
        initialTemplateInfo.editorVersion.version
      ).then((x) => x.concat(pack.gitPackages).concat(pack.localPackages));

      let paths: string[] = [];
      let rootMap = new Map<string, number>();

      if (files.root) {
        fileDirToPaths(files.selectedFiles, files.root, "", paths, rootMap);
      }

      // isLoading.set(false);
      // console.log("packages", packages);
      // console.log("selectedPackages", pack.selectedPackages);
      // console.log("templatePackages", pack.templatePackages);
      // console.log("gitPackages", pack.gitPackages);
      // console.log("localPackages", pack.localPackages);

      const finalPackages: TauriTypes.MinimalPackage[] =
        pack.selectedPackages.map((x) => ({
          name: x.name,
          version: x.version ?? "",
          isDiscoverable: true,
          isFile: false,
          type:
            packages.find((y) => y.name === x.name)?.type ??
            TauriTypes.PackageType.Internal,
        }));

      const trimmedPaths = paths.filter((path) => rootMap.get(path) === 1);
      const templateInfo: TauriTypes.TemplateInfoForGeneration = {
        template: initialTemplateInfo.selectedTemplate,
        editorVersion: initialTemplateInfo.editorVersion,
        packages: finalPackages,
        selectedFiles: [
          "package/package.json",
          "package/package.json.meta",
          ...trimmedPaths,
        ],
        isEmpty: false,
      };
      const template: TauriTypes.NewTemplateInfo = {
        template: templateInfo,
        ...newTemplateInfo,
      };

      try {
        const output = await TauriRouter.generate_template(template);

        console.log(output);

        // await TauriRouter.add_project(output);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        isLoading.set(false);

        globalContext.dispatch({ type: "change_tab", tab: "projects" });
        await new Promise((resolve) => setTimeout(resolve, 5));
        globalContext.dispatch({ type: "change_tab", tab: "new_project" });
      } catch (e) {
        console.error(e);
        isLoading.set(false);
      }

      isLoading.set(false);
      return;
    }

    if (!NewProjectContext.onLastTab(selectedTab)) {
      newProjectContext.dispatch({
        type: "change_tab",
        tab: NewProjectContext.getNextTab(selectedTab)!,
      });
    } else if (selectedTab === "info") {
      isLoading.set(true);

      // create project
      const basicInfo = newProjectContext.state.basicInfo;
      const template = newProjectContext.state.initialTemplateInfo;
      const pack = newProjectContext.state.packageInfo;
      const files = newProjectContext.state.filesInfo;

      const packages = await TauriRouter.get_default_editor_packages(
        template.editorVersion.version
      ).then((x) => x.concat(pack.gitPackages).concat(pack.localPackages));

      let paths: string[] = [];
      let rootMap = new Map<string, number>();

      if (files.root) {
        fileDirToPaths(files.selectedFiles, files.root, "", paths, rootMap);
      }

      const finalPackages: TauriTypes.MinimalPackage[] =
        pack.selectedPackages.map((x) => ({
          name: x.name,
          version: x.version ?? "",
          isDiscoverable: true,
          isFile: false,
          type:
            packages.find((y) => y.name === x.name)?.type ??
            TauriTypes.PackageType.Internal,
        }));

      const trimmedPaths = paths.filter((path) => rootMap.get(path) === 1);
      const templateInfo: TauriTypes.TemplateInfoForGeneration = {
        template: template.selectedTemplate,
        editorVersion: template.editorVersion,
        packages: finalPackages,
        selectedFiles: trimmedPaths,
        isEmpty: template.selectedTemplate === undefined,
      };
      const projectInfo: TauriTypes.ProjectInfoForGeneration = {
        name: basicInfo.name,
        path: basicInfo.path,
      };

      try {
        const output = await TauriRouter.generate_project(
          projectInfo,
          templateInfo
        );

        console.log(output);

        await TauriRouter.add_project(output);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        isLoading.set(false);

        globalContext.dispatch({ type: "change_tab", tab: "projects" });
      } catch (e) {
        console.error(e);
        isLoading.set(false);
      }
    }

    isLoading.set(false);
  }

  const selectedTab = newProjectContext.state.tab;
  const onFirstTab = NewProjectContext.onFirstTab(selectedTab);
  const onLastTab = NewProjectContext.onLastTab(selectedTab);
  const onTemplateTab = selectedTab === "new-template";

  // if (isLoading.value) {
  //   <div className="flex flex-col h-full justify-end">
  //     <div className="flex flex-row justify-between p-4 border-t border-t-stone-700 relative">
  //       <LoadingSpinner />
  //     </div>
  //   </div>;
  // }

  function gotoNewTemplate() {
    newProjectContext.dispatch({
      type: "change_tab",
      tab: "new-template",
    });
  }

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
        {selectedTab === "new-template" && <NewTemplateView />}
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
                hasFieldError.value ||
                newProjectContext.state.error.status === "error"
              }
              onClick={gotoNewTemplate}
            />
          )}

          <Buttons.ActionButton
            title={
              onTemplateTab
                ? "Create Template"
                : onLastTab
                ? "Create Project"
                : "Next"
            }
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
            <p>
              Creating your{" "}
              {selectedTab === "new-template" ? "template" : "project"}...
            </p>
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

function fileDirToPaths(
  selectedFiles: string[],
  fileDir: TauriTypes.FileDir,
  path: string,
  paths: string[],
  rootMap: Map<string, number>
) {
  if (path !== "" && !selectedFiles.includes(fileDir.id)) {
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
      fileDirToPaths(selectedFiles, child, path + "/", paths, rootMap);
    }
  }
}
