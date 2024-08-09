import React from "react";

export namespace Buttons {
  export function ActionButton({
    title,
    ...props
  }: {
    title: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
      <button
        {...props}
        className="rounded-md text-stone-50 bg-sky-600 px-3 py-1 select-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {title}
      </button>
    );
  }

  export function DefaultButton({
    title,
    ...props
  }: {
    title: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
      <button
        {...props}
        className="rounded-md text-stone-50 bg-stone-700 px-3 py-1 select-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {title}
      </button>
    );
  }

  export function BorderButton({
    title,
    ...props
  }: {
    title: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
      <button
        {...props}
        className="flex justify-between border border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border disabled:cursor-not-allowed disabled:opacity-50"
      >
        {title}
        {props.children}
      </button>
    );
  }
}
