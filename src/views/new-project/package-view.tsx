import { useContext, useEffect, useMemo } from "react";
import { LazyValue, UseState } from "../../utils";
import { NewProjectContext } from "../../context/new-project-context";
import useBetterState from "../../hooks/useBetterState";
import { TauriTypes } from "../../utils/tauri-types";
import AsyncLazyValueComponent from "../../components/async-lazy-value-component";
import LoadingSpinner from "../../components/svg/loading-spinner";
import { TauriRouter } from "../../utils/tauri-router";
import Checkmark from "../../components/svg/checkmark";
import Warning from "../../components/svg/warning";

const categories = ["All", "Internal", "Git", "Local"];

export default function PackageView() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const selectedCategory = useBetterState<string>("All");
  const onlyShowSelectedPackages = useBetterState<boolean>(false);
  const searchQuery = useBetterState("");

  const minimalPackages = useBetterState<
    LazyValue<{ package_: TauriTypes.MinimalPackage; category: string }[]>
  >({
    status: "loading",
    value: null,
  });

  useEffect(() => {
    const load = async () => {
      minimalPackages.set({ status: "loading", value: null });
      const newMinimalPackages = await TauriRouter.get_default_editor_packages(
        newProjectContext.state.initialTemplateInfo.editorVersion.version
      );
      minimalPackages.set({
        status: "success",
        // value: newMinimalPackages.filter((x) => x.isFile),
        value: newMinimalPackages.map((x) => ({
          package_: x,
          category: "Internal",
        })),
      });
    };
    load();
  }, []);

  function selectPackage(x: string) {
    const packages = newProjectContext.state.packageInfo.selectedPackages;
    const filtered = packages.filter((y) => y !== x);
    newProjectContext.dispatch({
      type: "set_packages",
      packages: [...filtered, x],
    });
  }

  function removePackage(x: string) {
    const packages = newProjectContext.state.packageInfo.selectedPackages;
    const filtered = packages.filter((y) => y !== x);
    newProjectContext.dispatch({
      type: "set_packages",
      packages: filtered,
    });
  }

  function togglePackage(x: string) {
    const packages = newProjectContext.state.packageInfo.selectedPackages;
    if (packages.includes(x)) {
      removePackage(x);
    } else {
      selectPackage(x);
    }
  }

  const queriedPackages = useMemo(() => {
    const validPackages = (minimalPackages.value.value ?? [])
      .filter((x) =>
        x.package_.name.toLowerCase().includes(searchQuery.value.toLowerCase())
      )
      .filter(
        (x) =>
          selectedCategory.value === "All" ||
          x.category === selectedCategory.value
      );

    if (!onlyShowSelectedPackages.value) {
      return validPackages;
    }

    const packages = newProjectContext.state.packageInfo.selectedPackages;
    return (
      validPackages.filter((x) => packages.includes(x.package_.name)) ?? []
    );
  }, [
    minimalPackages.value,
    onlyShowSelectedPackages.value,
    searchQuery.value,
    selectedCategory.value,
  ]);

  return (
    <div className="flex h-full">
      <Sidebar categories={categories} selectedCategory={selectedCategory} />
      <div className="px-4 pt-4 w-full flex flex-col overflow-y-auto">
        <AsyncLazyValueComponent
          loading={<LoadingSpinner />}
          value={minimalPackages.value}
        >
          <input
            type="search"
            className="rounded-md p-2 bg-stone-800 text-stone-50 border border-stone-600 placeholder:text-stone-400"
            placeholder="Search for a package"
            value={searchQuery.value}
            onChange={(e) => searchQuery.set(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />

          <div>
            <button
              className="flex gap-2 pt-2"
              onClick={() => onlyShowSelectedPackages.set((s) => !s)}
            >
              <div className="w-7 aspect-square border rounded-md border-stone-600 select-none">
                <div className="p-1">
                  {onlyShowSelectedPackages.value && <Checkmark />}
                </div>
              </div>
              <p className="select-none">Only show selected packages</p>
            </button>
          </div>

          {selectedCategory.value === "Git" && (
            <div className="flex pt-2">
              <input
                type="text"
                className="flex-grow rounded-md rounded-tr-none rounded-br-none border-r-0 p-2 bg-stone-800 text-stone-50 border border-stone-600 placeholder:text-stone-400"
                placeholder="Add a .git URL"
                value={searchQuery.value}
                onChange={(e) => searchQuery.set(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />

              <button className="text-stone-300 flex justify-between border border-stone-700 px-3 py-2 rounded-md rounded-tl-none rounded-bl-none hover:bg-stone-700 select-none cursor-pointer box-border">
                Add
              </button>
            </div>
          )}

          {selectedCategory.value === "Local" && (
            <div className="flex pt-2">
              <input
                type="text"
                className="flex-grow rounded-md rounded-tr-none rounded-br-none border-r-0 p-2 bg-stone-800 text-stone-50 border border-stone-600 placeholder:text-stone-400"
                placeholder="Add a package.json file path"
                value={searchQuery.value}
                onChange={(e) => searchQuery.set(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />

              <button className="text-stone-300 flex justify-between border border-stone-700 px-3 py-2 rounded-md rounded-tl-none rounded-bl-none hover:bg-stone-700 select-none cursor-pointer box-border">
                Add
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 py-3 w-full">
            {queriedPackages?.map((x, i) => (
              <Package
                key={i}
                package_={x}
                onClick={() => togglePackage(x.package_.name)}
                selected={newProjectContext.state.packageInfo.selectedPackages.includes(
                  x.package_.name
                )}
              />
            ))}
          </div>
        </AsyncLazyValueComponent>
      </div>
    </div>
  );
}

function Sidebar({
  categories,
  selectedCategory,
}: {
  categories: string[];
  selectedCategory: UseState<string>;
}) {
  const newProjectContext = useContext(NewProjectContext.Context);

  return (
    <div className="flex flex-col w-48 gap-2 border-r border-r-stone-700 pr-4 pt-4 overflow-y-auto flex-shrink-0">
      {categories.map((x, i) => (
        <button
          className={`flex justify-between border border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border ${
            selectedCategory.value === x
              ? "bg-sky-600 text-stone-50 border-stone-900"
              : "text-stone-300"
          }`}
          key={i}
          onClick={() => selectedCategory.set(x)}
        >
          {x}
        </button>
      ))}

      {newProjectContext.state.initialTemplateInfo.selectedTemplate && (
        <div className="flex border p-2 text-sm leading-[1.35rem] border-yellow-300 rounded-md mt-auto mb-4 select-none">
          <p>
            Changing the package list of a provided template can make assets no
            longer compile or function properly!
          </p>
        </div>
      )}
    </div>
  );
}

function Package({
  package_,
  onClick,
  selected,
}: {
  package_: {
    package_: TauriTypes.MinimalPackage;
    category?: string;
  };
  onClick?: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={`flex flex-col px-4 py-3 text-sm font-medium rounded-md border ${
        selected
          ? "border-l-8 border-l-sky-600 text-stone-50 border-sky-600 bg-stone-900"
          : "border-stone-600 hover:bg-stone-800"
      }`}
      onClick={onClick}
    >
      {/* <div className="h-full aspect-square border-r border-r-stone-600">
        <div className="p-2">{selected && <Checkmark />}</div>
      </div> */}
      <div className="flex justify-between w-full">
        <p className="flex basis-full text-stone-50 select-none">
          {package_.package_.name}{" "}
          <span
            className={`ml-auto ${
              selected ? "text-stone-50" : "text-stone-400"
            }`}
          >
            {package_.package_.version === ""
              ? "N/A"
              : package_.package_.version}
          </span>
        </p>
        {/* {value.isPinned && <p>Pinned</p>} */}
      </div>
      {package_.category && <p className="select-none">{package_.category}</p>}
    </button>
  );
}
