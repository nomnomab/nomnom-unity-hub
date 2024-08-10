import React from "react";
import { LazyValue, LazyVoid } from "../utils";

type Props<T> = {
  loading: React.ReactNode;
  error?: React.ReactNode;
  value: LazyValue<T> | undefined;
} & React.PropsWithChildren;
export default function AsyncLazyValueComponent<T>({
  value,
  ...props
}: Props<T>) {
  if (!value) {
    return null;
  }

  if (value.status === "loading") {
    return props.loading;
  }

  if (value.status === "error") {
    return props.error ?? <div>{JSON.stringify(value.error)}</div>;
  }

  return props.children;
}

type VoidProps = {
  loading: React.ReactNode;
  error?: React.ReactNode;
  value: LazyVoid | undefined;
} & React.PropsWithChildren;
export function AsyncLazyVoidComponent({ value, ...props }: VoidProps) {
  if (!value) {
    return null;
  }

  if (value.status === "loading") {
    return props.loading;
  }

  if (value.status === "error") {
    return props.error ?? <div>{JSON.stringify(value.error)}</div>;
  }

  return props.children;
}
