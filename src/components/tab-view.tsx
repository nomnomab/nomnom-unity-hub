import React, { useEffect } from "react";
import { UseState } from "../utils";

export interface TabData {
  id: number | string;
  title: string;
}

type Props = {
  selectedTab: UseState<number | string>;
  tabs: TabData[];
  onTabChanged?: (id: number | string) => void;
  style?: "button" | "label";
  className?: string;
  tabClassName?: string;
};
export default function TabView({ selectedTab, ...props }: Props) {
  useEffect(() => {
    selectedTab.set(props.tabs[0].id);
  }, []);

  useEffect(() => {
    if (props.onTabChanged && !!selectedTab.value) {
      props.onTabChanged(selectedTab.value);
    }
  }, [selectedTab.value]);

  const style = props.style ?? "button";
  return (
    <>
      <div className={props.className ?? "flex flex-row gap-2 p-4"}>
        {props.tabs.map((tab) => (
          <Tab
            key={tab.title}
            isSelected={selectedTab.value === tab.id}
            onClick={
              style === "button" ? () => selectedTab.set(tab.id) : undefined
            }
            customStyle={style}
            className={props.tabClassName}
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
  customStyle,
  ...props
}: {
  isSelected: boolean;
  customStyle: "button" | "label";
} & React.HTMLAttributes<HTMLButtonElement>) {
  if (customStyle === "label") {
    return (
      <span
        {...props}
        className={
          (props.className ??
            "rounded-md px-3 py-2 border select-none text-stone-50") +
          " " +
          (isSelected ? "bg-sky-600 border-stone-900" : " border-stone-600")
        }
      >
        {props.children}
      </span>
    );
  }

  return (
    <button
      {...props}
      className={
        (props.className ??
          "rounded-md px-3 py-2 border select-none text-stone-50") +
        " " +
        (isSelected ? "bg-sky-600 border-stone-900" : " border-stone-600")
      }
    >
      {props.children}
    </button>
  );
}
