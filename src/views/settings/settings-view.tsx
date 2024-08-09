import SectionView from "../../components/section-view";
import ViewBody from "../../components/view-body";
import SettingsBody from "./settings-body";
import SettingsHeader from "./settings-header";

export default function SettingsView() {
  return (
    <SectionView>
      <SettingsHeader />
      <ViewBody>
        <SettingsBody />
      </ViewBody>
    </SectionView>
  );
}
