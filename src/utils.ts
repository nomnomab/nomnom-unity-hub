// A little bit simplified version
export const groupBy = <T, K extends keyof any>(arr: T[], key: (i: T) => K) =>
  arr.reduce((groups, item) => {
    (groups[key(item)] ||= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);

export type LazyVoid = {
  status: "idle" | "loading" | "success" | "error";
  error?: Error | null;
};

export type LazyValue<T> = {
  status: "idle" | "loading" | "success" | "error";
  value: T | null;
  error?: Error | null;
};

export function convertBytes(
  bytes: number,
  options: { useBinaryUnits?: boolean; decimals?: number } = {}
): string {
  const { useBinaryUnits = false, decimals = 2 } = options;

  if (decimals < 0) {
    throw new Error(`Invalid decimals ${decimals}`);
  }

  const base = useBinaryUnits ? 1024 : 1000;
  const units = useBinaryUnits
    ? ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
    : ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(base));

  return `${(bytes / Math.pow(base, i)).toFixed(decimals)} ${units[i]}`;
}

export type UseState<T> = {
  value: T;
  set: React.Dispatch<React.SetStateAction<T>>;
};

export function toUseState<T>(
  state: [T, React.Dispatch<React.SetStateAction<T>>]
): UseState<T> {
  return { value: state[0], set: state[1] };
}
