import { useState } from "react";
import { toUseState } from "../utils";

export default function useBetterState<T>(initialState: T) {
  const [state, setState] = useState(initialState);
  return toUseState([state, setState]);
}
