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

  return (
    <>
      <ValidateInputContext.User>
        <Info />
      </ValidateInputContext.User>

      <NewProjectOverview />
    </>
  );
}

function Info() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const basicInfo = useMemo(() => {
    return newProjectContext.state.basicInfo;
  }, [newProjectContext.state.basicInfo]);

  const validateContext = useContext(ValidateInputContext.Context);

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

  useEffect(() => {
    ValidateInputContext.isBadPath(basicInfo.path).then((err) => {
      validateContext.dispatch({
        type: "set_error",
        key: "empty_project_path",
        value: err,
      });
      validateContext.dispatch({
        type: "refresh",
      });
    });
  }, [basicInfo.name, basicInfo.path]);

  useEffect(() => {
    newProjectContext.dispatch({
      type: "set_has_error",
      hasError: Object.values(validateContext.state.hasError).some((v) => v),
    });
  }, [validateContext.state.hasError]);

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pt-4 flex-shrink-0">
      <ValidateInput
        label="Project Name"
        name="projectName"
        value={basicInfo.name}
        hasError={() => ValidateInputContext.isEmptyString(basicInfo.name)}
        onChange={(e) => {
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
        hasError={() =>
          ValidateInputContext.isEmptyString(basicInfo.path) ||
          validateContext.state.hasError["empty_project_path"]
        }
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
  );
}

export function NewProjectOverview(props: {
  noOverflow?: boolean;
  customOutputPath?: string;
}) {
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
    <div
      className={`mt-8 select-none border-t border-t-stone-700 pb-2 ${
        props.noOverflow ? "" : "overflow-y-auto"
      }`}
    >
      <p className="text-xl pb-1 pt-4">Overview</p>

      <div className="text-stone-400 flex w-full">
        <p className="flex-shrink-0">Editor version</p>
        <span className="ml-auto">
          {initialTemplateInfo.editorVersion.version}
        </span>
      </div>

      <div className="text-stone-400 flex w-full">
        <p className="flex-shrink-0">Selected template</p>
        <span className="ml-auto">
          {initialTemplateInfo.selectedTemplate?.name ?? "N/A"}
          {" @ "}
          <span>{initialTemplateInfo.selectedTemplate?.version ?? "N/A"}</span>
        </span>
      </div>

      <div className="text-stone-400 flex w-full">
        <p className="flex-shrink-0">Output path</p>
        {props.customOutputPath ? (
          <span className="ml-auto text-wrap text-right">
            {props.customOutputPath}
          </span>
        ) : (
          <span className="ml-auto text-wrap text-right">
            {basicInfo.path}\{basicInfo.name}
          </span>
        )}
      </div>

      <div className="text-stone-400 flex w-full">
        <p className="flex-shrink-0">Packages</p>
        <span className="ml-auto">{packageInfo.selectedPackages.length}</span>
      </div>
      {packageInfo.selectedPackages.map((p) => (
        <p key={p.name + p.version} className="text-stone-400 w-full pl-4">
          - {p.name} @ {p.version}
        </p>
      ))}

      <div className="text-stone-400 flex w-full">
        <p className="flex-shrink-0">Files</p>
        <span className="ml-auto">{filesInfo.selectedFiles.length}</span>
      </div>
    </div>
  );
}
