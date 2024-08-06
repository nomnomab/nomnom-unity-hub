import React from "react";

type Props = {
  title: string;
  titleChildren?: React.ReactNode;
} & React.PropsWithChildren;
export default function ViewHeader(props: Props) {
  return (
    <div className="flex flex-row border-b border-b-stone-700 justify-center h-[90px] overflow-hidden">
      <div className="flex flex-row w-full max-w-6xl px-8 py-8 items-center">
        <div className="text-stone-50 flex flex-row items-center">
          <h1 className="select-none">{props.title}</h1>
          {props.titleChildren}
        </div>

        {props.children}
      </div>
    </div>
  );
}
