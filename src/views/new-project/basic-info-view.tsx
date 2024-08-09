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
}: {
  hasFieldError: UseState<boolean>;
}) {
  const newProjectContext = useContext(NewProjectContext.Context);
  const basicInfo = useMemo(() => {
    return newProjectContext.state.basicInfo;
  }, [newProjectContext.state.basicInfo]);

  useEffect(() => {
    TauriRouter.get_default_project_path().then((path) => {
      newProjectContext.dispatch({
        type: "set_basic_info_path",
        path: path as string,
      });
    });
  }, []);

  useEffect(() => {});

  async function selectProjectFolder() {
    const path = await open({
      directory: true,
      multiple: false,
      defaultPath: basicInfo.path,
    });

    if (!path) return;

    newProjectContext.dispatch({
      type: "set_basic_info_path",
      path: path as string,
    });
  }

  return (
    <>
      <ValidateInputContext onErrorChanged={hasFieldError.set}>
        <div className="flex flex-col gap-2 overflow-y-auto pt-4 flex-shrink-0">
          <ValidateInput
            label="Project Name"
            name="projectName"
            value={basicInfo.name}
            errorMessage={() => "Project name cannot be empty"}
            hasError={() => !basicInfo.name || basicInfo.name.length === 0}
            onChange={(e) => {
              console.log(e.target.value);
              newProjectContext.dispatch({
                type: "set_basic_info_name",
                name: e.target.value,
              });
            }}
            className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
          />

          <ValidateInputWithButton
            label="Project Path"
            name="projectPath"
            value={basicInfo.path}
            errorMessage={() => {
              if (!basicInfo.path || basicInfo.path.length === 0) {
                return "Project path cannot be empty";
              }

              return "error";
            }}
            hasError={() => !basicInfo.path || basicInfo.path.length === 0}
            onChange={(e) =>
              newProjectContext.dispatch({
                type: "set_basic_info_path",
                path: e.target.value,
              })
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
  const basicInfo = useMemo(() => {
    return newProjectContext.state.basicInfo;
  }, [newProjectContext.state.basicInfo]);
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
    <div className="mt-8 select-none border-t border-t-stone-700 overflow-y-auto pb-2">
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
        Output path
        <span className="ml-auto">
          {basicInfo.path}\{basicInfo.name}
        </span>
      </p>

      <p className="text-stone-400 flex w-full">
        Packages
        <span className="ml-auto">{packageInfo.selectedPackages.length}</span>
      </p>
      {packageInfo.selectedPackages.map((p) => (
        <p key={p} className="text-stone-400 w-full pl-4">
          - {p}
        </p>
      ))}

      <p className="text-stone-400 flex w-full">
        Files
        <span className="ml-auto">{filesInfo.selectedFiles.length}</span>
      </p>
    </div>
  );
}
