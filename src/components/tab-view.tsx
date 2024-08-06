import React, { useEffect } from "react";
import useBetterState from "../hooks/useBetterState";

export interface TabData {
  id: number | string;
  title: string;
}

type Props = {
  tabs: TabData[];
  onTabChanged?: (id: number | string) => void;
};
export default function TabView(props: Props) {
  const selectedTab = useBetterState<TabData | null>(null);

  useEffect(() => {
    selectedTab.set(props.tabs[0]);
  }, []);

  useEffect(() => {
    if (props.onTabChanged && !!selectedTab.value) {
      props.onTabChanged(selectedTab.value.id);
    }
  }, [selectedTab.value]);

  return (
    <>
      <div className="flex flex-row gap-2 p-4">
        {props.tabs.map((tab) => (
          <Tab
            key={tab.title}
            isSelected={selectedTab.value?.id === tab.id}
            onClick={() => selectedTab.set(tab)}
          >
            {tab.title}
          </Tab>
        ))}
      </div>

      {/* {props.children
        ? props.children(selectedTab.value?.child)
        : selectedTab.value?.child} */}
    </>
  );
}

function Tab({
  isSelected,
  ...props
}: {
  isSelected: boolean;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "rounded-md px-3 py-2 border select-none text-stone-50 " +
        (isSelected ? "bg-sky-600 border-stone-900" : " border-stone-600")
      }
    >
      {props.children}
    </button>
  );
}
