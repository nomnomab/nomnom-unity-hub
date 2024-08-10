import SectionView from "../../components/section-view";
import ViewBody from "../../components/view-body";
import SettingsBody from "./settings-body";
import SettingsHeader from "./settings-header";

type Props = {
  overrideClassName?: string;
  noHeader?: boolean;
  onBadPref?: (bad: boolean) => void;
};
export default function SettingsView(props: Props) {
  return (
    <SectionView>
      {props.noHeader || <SettingsHeader />}
      <ViewBody>
        <SettingsBody
          overrideClassName={props.overrideClassName}
          onBadPref={props.onBadPref}
        />
      </ViewBody>
    </SectionView>
  );
}
