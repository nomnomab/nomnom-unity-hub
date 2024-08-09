import { useContext } from "react";
import { Buttons } from "../../components/parts/buttons";
import ViewHeader from "../../components/view-header";
import { GlobalContext } from "../../context/global-context";
import { TauriRouter } from "../../utils/tauri-router";
import { open } from "@tauri-apps/api/dialog";
import { UseState } from "../../utils";
import { ProjectViewData } from "./projects-view";

export default function ProjectsHeader({
  projectData,
}: {
  projectData: UseState<ProjectViewData>;
}) {
  const globalContext = useContext(GlobalContext.Context);

  async function addExistingProject() {
    const folder = await open({
      directory: true,
      multiple: false,
    });
    if (!folder) return;

    const project = await TauriRouter.add_project(folder as string);
    console.log("project:", project);

    const results = await TauriRouter.get_projects();
    console.log("projects:", results);

    projectData.set((s) => ({ ...s, projects: results }));
    // dispatch({ type: "set_projects", projects: results });
  }

  async function startNewProject() {
    globalContext.dispatch({ type: "change_tab", tab: "new_project" });
  }

  return (
    <ViewHeader title="Projects">
      <div className="ml-auto" />
      <Buttons.DefaultButton title="Add" onClick={addExistingProject} />
      <div className="ml-2" />
      <Buttons.ActionButton title="New" onClick={startNewProject} />
    </ViewHeader>
  );
}
