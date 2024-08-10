import { useContext, useEffect, useMemo } from "react";
import {
  ValidateInput,
  ValidateInputContext,
  ValidateTextArea,
} from "../../components/validate-input";
import { NewProjectContext } from "../../context/new-project-context";
import { NewProjectOverview } from "./basic-info-view";
import useBetterState from "../../hooks/useBetterState";
import { TauriRouter } from "../../utils/tauri-router";
import FilesView from "./files-view";

export default function NewTemplateView() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const newTemplateInfo = useMemo(() => {
    return newProjectContext.state.newTemplateInfo;
  }, [newProjectContext.state.newTemplateInfo]);

  const validateInputContext = useContext(ValidateInputContext.Context);

  const newTemplateOutputPath = useBetterState("");

  useEffect(() => {
    TauriRouter.get_prefs().then((prefs) => {
      newTemplateOutputPath.set((prefs.hubAppdataPath ?? "") + "\\Templates");
    });
  }, []);

  const finalPath = useMemo(() => {
    return `${newTemplateOutputPath.value}\\${newTemplateInfo.name}-${newTemplateInfo.version}.tgz`;
  }, [
    newTemplateOutputPath.value,
    newTemplateInfo.name,
    newTemplateInfo.version,
  ]);

  return (
    <div className="flex h-full py-4">
      {/* name */}
      {/* display name */}
      {/* version */}
      {/* description */}

      <div className="flex flex-col w-full overflow-y-auto gap-2">
        <ValidateInputContext.User>
          <Fields finalPath={finalPath} />
        </ValidateInputContext.User>

        <div>
          <FilesView startAtRoot />
        </div>

        <NewProjectOverview noOverflow customOutputPath={finalPath} />
      </div>
    </div>
  );
}

function Fields(props: { finalPath: string }) {
  const newProjectContext = useContext(NewProjectContext.Context);
  const newTemplateInfo = useMemo(() => {
    return newProjectContext.state.newTemplateInfo;
  }, [newProjectContext.state.newTemplateInfo]);

  const validateInputContext = useContext(ValidateInputContext.Context);

  function validate() {
    ValidateInputContext.isBadPath(props.finalPath).then((err) => {
      const templateName = `${newTemplateInfo.name}-${newTemplateInfo.version}`;
      err = err
        ? null
        : new Error(`This template already exists: '${templateName}'`);

      validateInputContext.dispatch({
        type: "set_error",
        key: "bad_path",
        value: err,
      });
      validateInputContext.dispatch({
        type: "refresh",
      });
    });
  }

  useEffect(() => {
    validate();
  }, []);

  useEffect(() => {
    validate();
  }, [newTemplateInfo.name, newTemplateInfo.version, props.finalPath]);

  useEffect(() => {
    newProjectContext.dispatch({
      type: "set_has_error",
      hasError: Object.values(validateInputContext.state.hasError).some(
        (v) => v
      ),
    });
  }, [validateInputContext.state.hasError]);

  return (
    <>
      <ValidateInput
        label="Name"
        name="name"
        value={newTemplateInfo.name}
        onChange={(e) =>
          newProjectContext.dispatch({
            type: "set_new_template_name",
            name: e.target.value,
          })
        }
        hasError={() =>
          ValidateInputContext.isEmptyString(newTemplateInfo.name) ||
          ValidateInputContext.hasWhitespace(newTemplateInfo.name) ||
          ValidateInputContext.isNotComName(
            newTemplateInfo.name,
            "com.company.name"
          ) ||
          validateInputContext.state.hasError["bad_path"]
        }
        className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
      />
      <ValidateInput
        label="Display Name"
        name="displayName"
        value={newTemplateInfo.displayName}
        onChange={(e) =>
          newProjectContext.dispatch({
            type: "set_new_template_display_name",
            displayName: e.target.value,
          })
        }
        hasError={() =>
          ValidateInputContext.isEmptyString(newTemplateInfo.displayName)
        }
        className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
      />
      <ValidateInput
        label="Version"
        name="version"
        value={newTemplateInfo.version}
        onChange={(e) =>
          newProjectContext.dispatch({
            type: "set_new_template_version",
            version: e.target.value,
          })
        }
        hasError={() =>
          ValidateInputContext.isEmptyString(newTemplateInfo.version) ||
          ValidateInputContext.isNotComName(newTemplateInfo.version, "1.0.0") ||
          validateInputContext.state.hasError["bad_path"]
        }
        className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
      />
      <ValidateTextArea
        label="Description"
        name="description"
        value={newTemplateInfo.description}
        onChange={(e) =>
          newProjectContext.dispatch({
            type: "set_new_template_description",
            description: e.target.value,
          })
        }
        hasError={() =>
          ValidateInputContext.isEmptyString(newTemplateInfo.description)
        }
        className="w-full p-2 rounded-md border border-stone-600 bg-stone-800 min-h-24 max-h-64"
      />
    </>
  );
}
