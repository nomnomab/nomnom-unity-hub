import SectionView from "../../components/section-view";
import ProjectsHeader from "./projects-header";
import ProjectList from "./projects-list";
import { TauriTypes } from "../../utils/tauri-types";
import ViewBody from "../../components/view-body";
import useBetterState from "../../hooks/useBetterState";

export type ProjectViewData = {
  allProjects: TauriTypes.Project[];
  projects: TauriTypes.Project[];
  currentPage: number;
};

export default function ProjectsView() {
  const projects = useBetterState<ProjectViewData>({
    allProjects: [],
    projects: [],
    currentPage: 0,
  });
  return (
    <SectionView>
      <ProjectsHeader projectData={projects} />
      <ViewBody>
        <ProjectList projectData={projects} />
      </ViewBody>
    </SectionView>
  );
}
