import SectionView from "../../components/section-view";
import ViewBody from "../../components/view-body";
import NewProjectBody from "./new-project-body";
import NewProjectHeader from "./new-project-header";

export default function NewProjectView() {
  return (
    <SectionView>
      <NewProjectHeader />
      <ViewBody>
        <NewProjectBody />
      </ViewBody>
    </SectionView>
  );
}
