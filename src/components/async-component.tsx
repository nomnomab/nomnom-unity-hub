import React, { useCallback, useEffect } from "react";
import { LazyVoid } from "../utils";

type Props = {
  loading: React.ReactNode;
  error?: (err: string | Error | null | undefined) => React.ReactNode;
  callback: () => Promise<unknown>;
} & React.PropsWithChildren;
export default function AsyncComponent(props: Props) {
  const [state, setState] = React.useState<LazyVoid>({
    status: "loading",
  });

  useEffect(() => {
    props
      .callback()
      .then(() => setState({ status: "success" }))
      .catch((err) => setState({ status: "error", error: err }));
  }, [props.callback]);

  if (state.status === "loading") {
    return props.loading;
  }

  if (state.status === "error") {
    return (props.error && props.error(state.error)) ?? null;
  }

  return props.children;
}
