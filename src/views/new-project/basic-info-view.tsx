import { useContext, useEffect, useMemo } from "react";
import FolderOpen from "../../components/svg/folder-open";
import {
  ValidateInputContext,
  ValidateInput,
  ValidateInputWithButton,
} from "../../components/validate-input";
import { UseState } from "../../utils";
import { TauriRouter } from "../../utils/tauri-router";
import { NewProjectData } from "./new-project-body";
import { open } from "@tauri-apps/api/dialog";
import { NewProjectContext } from "../../context/new-project-context";

export default function BasicInfoView({
  hasFieldError,
  data,
}: {
  hasFieldError: UseState<boolean>;
  data: UseState<NewProjectData>;
}) {
  useEffect(() => {
    TauriRouter.get_default_project_path().then((path) => {
      data.set((s) => ({ ...s, projectPath: path as string }));
    });
  }, []);

  async function selectProjectFolder() {
    const path = await open({
      directory: true,
      multiple: false,
      defaultPath: data.value.projectPath,
    });

    if (!path) return;

    data.set((s) => ({ ...s, projectPath: path as string }));
  }

  return (
    <>
      <ValidateInputContext onErrorChanged={hasFieldError.set}>
        <div className="flex flex-col gap-2 overflow-y-auto pt-4">
          <ValidateInput
            label="Project Name"
            name="projectName"
            value={data.value.projectName}
            errorMessage={() => "Project name cannot be empty"}
            hasError={() =>
              !data.value.projectName || data.value.projectName.length === 0
            }
            onChange={(e) => {
              console.log(e.target.value);
              data.set((s) => ({ ...s, projectName: e.target.value }));
            }}
            className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
          />

          <ValidateInputWithButton
            label="Project Path"
            name="projectPath"
            value={data.value.projectPath}
            errorMessage={() => {
              if (
                !data.value.projectPath ||
                data.value.projectPath.length === 0
              ) {
                return "Project path cannot be empty";
              }

              return "error";
            }}
            hasError={() =>
              !data.value.projectPath || data.value.projectPath.length === 0
            }
            onChange={(e) =>
              data.set((s) => ({ ...s, projectPath: e.target.value }))
            }
            className="w-full p-2 rounded-md border rounded-tr-none rounded-br-none border-r-0 border-stone-600 bg-stone-800"
            divProps={{
              className: "flex-grow",
            }}
          >
            <button
              className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
              onClick={selectProjectFolder}
            >
              <FolderOpen />
            </button>
          </ValidateInputWithButton>
          {/* <div className="h-[5000px]"></div> */}
        </div>
      </ValidateInputContext>

      <Overview />
    </>
  );
}

function Overview() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const initialTemplateInfo = useMemo(() => {
    return newProjectContext.state.initialTemplateInfo;
  }, [newProjectContext.state.initialTemplateInfo]);
  const packageInfo = useMemo(() => {
    return newProjectContext.state.packageInfo;
  }, [newProjectContext.state.packageInfo]);
  const filesInfo = useMemo(() => {
    return newProjectContext.state.filesInfo;
  }, [newProjectContext.state.filesInfo]);

  return (
    <div className="mt-8 select-none border-t border-t-stone-700">
      <p className="text-xl pb-1 pt-4">Overview</p>

      <p className="text-stone-400 flex w-full">
        Editor version
        <span className="ml-auto">
          {initialTemplateInfo.editorVersion.version}
        </span>
      </p>

      <p className="text-stone-400 flex w-full">
        Selected template
        <span className="ml-auto">
          {initialTemplateInfo.selectedTemplate?.name ?? "N/A"}
          {" @ "}
          <span>{initialTemplateInfo.selectedTemplate?.version ?? "N/A"}</span>
        </span>
      </p>

      <p className="text-stone-400 flex w-full">
        Packages
        <span className="ml-auto">{packageInfo.selectedPackages.length}</span>
      </p>
      <div className="max-h-64 overflow-y-auto">
        {packageInfo.selectedPackages.map((p) => (
          <p key={p} className="text-stone-400 w-full pl-4">
            - {p}
          </p>
        ))}
      </div>

      <p className="text-stone-400 flex w-full">
        Files
        <span className="ml-auto">{filesInfo.selectedFiles.length}</span>
      </p>
    </div>
  );
}
