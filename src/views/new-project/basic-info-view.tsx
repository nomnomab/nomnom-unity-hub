import { useEffect } from "react";
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
        <div className="flex flex-col gap-2 overflow-y-auto">
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
    </>
  );
}
