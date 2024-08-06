import SectionView from "../../components/section-view";
import ViewBody from "../../components/view-body";
import EditorsHeader from "./editors-header";
import EditorsList from "./editors-list";

export default function EditorsView() {
  return (
    <SectionView>
      <EditorsHeader />
      <ViewBody>
        <EditorsList />
      </ViewBody>
    </SectionView>
  );
}
