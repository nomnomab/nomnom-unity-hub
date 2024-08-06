import useBetterState from "../../hooks/useBetterState";
import { Buttons } from "../../components/parts/buttons";
import TabView from "../../components/tab-view";
import BasicInfoView from "./basic-info-view";
import PackageView from "./package-view";

export type NewProjectData = {
  projectName: string;
  projectPath: string;
};
export default function NewProjectBody() {
  const hasFieldError = useBetterState(false);
  const data = useBetterState({
    projectName: "New Project",
    projectPath: "",
  });

  const currentTab = useBetterState(-1);

  return (
    <div className="flex flex-col h-full">
      <TabView
        tabs={[
          { id: 0, title: "Basic Info" },
          { id: 1, title: "Packages" },
        ]}
        onTabChanged={(id) => currentTab.set(id as number)}
      />
      <div
        className="flex flex-col p-4 pt-0 overflow-y-auto"
        style={{ height: "calc(100% - 48px)" }}
      >
        {currentTab.value === 0 && (
          <BasicInfoView data={data} hasFieldError={hasFieldError} />
        )}
        {currentTab.value === 1 && <PackageView />}
      </div>
      <div className="flex flex-row justify-end p-4 border-t border-t-stone-700">
        <Buttons.ActionButton title="Create" disabled={hasFieldError.value} />
      </div>
    </div>
  );
}
