import React from "react";

export default function SectionView(props: React.PropsWithChildren) {
  return <div className="flex flex-col w-full relative">{props.children}</div>;
}
