import { useCallback, useMemo } from "react";
import useBetterState from "../../hooks/useBetterState";
import { TauriRouter } from "../../utils/tauri-router";
import AsyncComponent from "../../components/async-component";
import LoadingSpinner from "../../components/svg/loading-spinner";

export default function PackageView() {
  const packages = useBetterState<
    {
      name: string;
      version: string;
    }[]
  >([]);
  const getPackages = useCallback(async () => {
    const p = await TauriRouter.get_default_editor_packages("2022.3.40f1");
    packages.set(p);
  }, []);

  const search = useBetterState("");
  const filteredPackages = useMemo(() => {
    return packages.value.filter((p) =>
      p.name.toLowerCase().includes(search.value.toLowerCase())
    );
  }, [packages.value, search.value]);

  return (
    <>
      <div className="mb-4">
        <input
          type="search"
          className="rounded-md p-2 bg-stone-800 text-stone-50 border border-stone-600"
          value={search.value}
          onChange={(e) => search.set(e.target.value)}
        />
      </div>
      <AsyncComponent loading={<LoadingSpinner />} callback={getPackages}>
        <>
          <div className="flex flex-col overflow-y-auto gap-2">
            {filteredPackages.map((p) => (
              <Package key={p.name} data={p} />
            ))}
          </div>
        </>
      </AsyncComponent>
    </>
  );
}

function Package({
  data,
}: {
  data: {
    name: string;
    version: string;
  };
}) {
  return (
    <button className="flex flex-grow justify-between border border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border">
      <p>{data.name}</p>
      <p>{data.version.length === 0 ? "-" : data.version}</p>
    </button>
  );
}
