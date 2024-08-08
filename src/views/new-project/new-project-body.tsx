import useBetterState from "../../hooks/useBetterState";
import { Buttons } from "../../components/parts/buttons";
import TabView from "../../components/tab-view";
import BasicInfoView from "./basic-info-view";
import PackageView from "./package-view";
import TemplateView from "./template-view";

export type NewProjectData = {
  projectName: string;
  projectPath: string;
};

const tabs = [
  { id: "template", title: "Template" },
  { id: "packages", title: "Packages" },
  { id: "basic-info", title: "Basic Info" },
];

export default function NewProjectBody() {
  const hasFieldError = useBetterState(false);
  const data = useBetterState({
    projectName: "New Project",
    projectPath: "",
  });

  const selectedTab = useBetterState<string | number>(tabs[0].id);

  function gotoNextTab() {
    const index = tabs.findIndex((x) => x.id === selectedTab.value);
    if (index < tabs.length - 1) {
      selectedTab.set(tabs[index + 1].id);
    }
  }

  const onLastTab = selectedTab.value === tabs[tabs.length - 1].id;

  return (
    <div className="flex flex-col h-full">
      <TabView
        selectedTab={selectedTab}
        tabs={tabs}
        onTabChanged={selectedTab.set}
      />
      <div
        className="flex flex-col px-4 pt-0 overflow-hidden"
        style={{ height: "calc(100% - 48px)" }}
      >
        {selectedTab.value === "template" && <TemplateView />}
        {selectedTab.value === "basic-info" && (
          <BasicInfoView data={data} hasFieldError={hasFieldError} />
        )}
        {selectedTab.value === "packages" && <PackageView />}
      </div>
      <div className="flex flex-row justify-end p-4 border-t border-t-stone-700">
        <Buttons.ActionButton
          title={onLastTab ? "Create" : "Next"}
          disabled={hasFieldError.value}
          onClick={gotoNextTab}
        />
      </div>
    </div>
  );
}
