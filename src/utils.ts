// A little bit simplified version
export const groupBy = <T, K extends keyof any>(arr: T[], key: (i: T) => K) =>
	arr.reduce((groups, item) => {
		(groups[key(item)] ||= []).push(item);
		return groups;
	}, {} as Record<K, T[]>);

export type Lazy<T> = {
	status: "idle" | "loading" | "success" | "error";
	value: T | null;
	error?: Error | null;
};
