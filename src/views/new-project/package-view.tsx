import { useContext, useEffect, useMemo } from "react";
import { LazyValue, LazyVoid, UseState } from "../../utils";
import { NewProjectContext } from "../../context/new-project-context";
import useBetterState from "../../hooks/useBetterState";
import { TauriTypes } from "../../utils/tauri-types";
import AsyncLazyValueComponent from "../../components/async-lazy-value-component";
import LoadingSpinner from "../../components/svg/loading-spinner";
import { TauriRouter } from "../../utils/tauri-router";
import Checkmark from "../../components/svg/checkmark";
import FolderOpen from "../../components/svg/folder-open";
import { open } from "@tauri-apps/api/dialog";
import { Buttons } from "../../components/parts/buttons";
import Delete from "../../components/svg/delete";

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
      )
        .then((x) =>
          x.map((x) => ({
            package_: x,
            category: "Internal",
          }))
        )
        .then(async (x) => {
          const p = await TauriRouter.get_user_cache();
          const gitPackages = p.gitPackages.map((x) => ({
            package_: x,
            category: "Git",
          }));

          const localPackages = p.localPackages.map((x) => ({
            package_: x,
            category: "Local",
          }));
          return [...x, ...gitPackages, ...localPackages];
        });

      minimalPackages.set({
        status: "success",
        // value: newMinimalPackages.filter((x) => x.isFile),
        // value: newMinimalPackages.map((x) => ({
        //   package_: x,
        //   category: "Internal",
        // })),
        value: newMinimalPackages,
      });
    };
    load();
  }, []);

  function selectPackage(name: string, version?: string) {
    const packages = newProjectContext.state.packageInfo.selectedPackages;
    const filtered = packages.filter(
      (y) => y.name !== name && y.version !== version
    );
    newProjectContext.dispatch({
      type: "set_packages",
      packages: [...filtered, { name, version }],
    });
  }

  function removePackage(name: string, version: string) {
    const packages = newProjectContext.state.packageInfo.selectedPackages;
    const filtered = packages.filter(
      (y) => y.name !== name || y.version !== version
    );

    newProjectContext.dispatch({
      type: "set_packages",
      packages: filtered,
    });
  }

  function togglePackage(name: string, version: string) {
    const packages = newProjectContext.state.packageInfo.selectedPackages;
    if (packages.find((x) => x.name === name && x.version === version)) {
      removePackage(name, version);
    } else {
      selectPackage(name, version);
    }

    // if (packages.includes(x)) {
    //   removePackage(x);
    // } else {
    //   selectPackage(x);
    // }
  }

  const queriedPackages = useMemo(() => {
    const gitPackages = newProjectContext.state.packageInfo.gitPackages.map(
      (x) => ({
        package_: x,
        category: "Git",
      })
    );
    const localPackages = newProjectContext.state.packageInfo.localPackages.map(
      (x) => ({
        package_: x,
        category: "Local",
      })
    );

    const validPackages = (minimalPackages.value.value ?? [])
      .concat(gitPackages)
      .concat(localPackages)
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
      validPackages.filter((x) =>
        packages.find(
          (y) => y.name === x.package_.name && y.version === x.package_.version
        )
      ) ?? []
    );
  }, [
    minimalPackages.value,
    onlyShowSelectedPackages.value,
    searchQuery.value,
    selectedCategory.value,
    newProjectContext.state.packageInfo.gitPackages,
    newProjectContext.state.packageInfo.localPackages,
  ]);

  async function destroyPackage(package_: TauriTypes.MinimalPackage) {
    if (package_.type === TauriTypes.PackageType.Local) {
      await TauriRouter.remove_local_package_from_cache(package_);
      newProjectContext.dispatch({
        type: "set_packages",
        packages: newProjectContext.state.packageInfo.selectedPackages.filter(
          (x) => x.name !== package_.name && x.version !== package_.version
        ),
      });
      newProjectContext.dispatch({
        type: "remove_local_package",
        package: package_,
      });
      minimalPackages.set({
        ...minimalPackages.value,
        value: minimalPackages.value.value!.filter(
          (x) =>
            x.package_.name !== package_.name &&
            x.package_.version !== package_.version
        ),
      });
    } else if (package_.type === TauriTypes.PackageType.Git) {
      await TauriRouter.remove_git_package_from_cache(package_);
      newProjectContext.dispatch({
        type: "set_packages",
        packages: newProjectContext.state.packageInfo.selectedPackages.filter(
          (x) => x.name !== package_.name && x.version !== package_.version
        ),
      });
      newProjectContext.dispatch({
        type: "remove_git_package",
        package: package_,
      });
      minimalPackages.set({
        ...minimalPackages.value,
        value: minimalPackages.value.value!.filter(
          (x) =>
            x.package_.name !== package_.name &&
            x.package_.version !== package_.version
        ),
      });
    }
  }

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
            <GitAdd selectPackage={selectPackage} />
          )}
          {selectedCategory.value === "Local" && (
            <LocalAdd selectPackage={selectPackage} />
          )}

          <div className="flex flex-col gap-2 py-3 w-full">
            {queriedPackages?.map((x, i) => (
              <Package
                key={i}
                package_={x}
                onClick={() =>
                  togglePackage(x.package_.name, x.package_.version)
                }
                destroyPackage={destroyPackage}
                selected={newProjectContext.state.packageInfo.selectedPackages.some(
                  (y) =>
                    y.name === x.package_.name &&
                    y.version === x.package_.version
                )}
              />
            ))}
          </div>
        </AsyncLazyValueComponent>
      </div>
    </div>
  );
}

function GitAdd(props: {
  selectPackage: (name: string, version?: string) => void;
}) {
  const newProjectContext = useContext(NewProjectContext.Context);
  const gitPackageJson = useBetterState("");
  const gitPackageId = useBetterState("");
  const gitPackageUrl = useBetterState("");
  const tab = useBetterState<"url" | "manifest">("url");

  async function addPackage() {
    if (tab.value === "url") {
      if (gitPackageId.value === "") return;
      if (gitPackageUrl.value === "") return;
      if (
        newProjectContext.state.packageInfo.gitPackages.some(
          (x) =>
            x.type === TauriTypes.PackageType.Git &&
            x.version === gitPackageUrl.value
        )
      ) {
        return;
      }

      await TauriRouter.add_git_package_to_cache({
        name: gitPackageId.value,
        version: gitPackageUrl.value,
        isFile: false,
        type: TauriTypes.PackageType.Git,
      });

      newProjectContext.dispatch({
        type: "add_git_package",
        package: {
          id: gitPackageId.value,
          url: gitPackageUrl.value,
        },
      });

      gitPackageId.set("");
      gitPackageUrl.set("");

      props.selectPackage(gitPackageId.value, gitPackageUrl.value);
    } else {
      if (gitPackageJson.value === "") return;

      try {
        const obj: { [key: string]: string } = JSON.parse(
          `{${gitPackageJson.value}}`
        );
        const [name, version] = Object.entries(obj)[0];

        if (
          newProjectContext.state.packageInfo.gitPackages.some(
            (x) =>
              x.type === TauriTypes.PackageType.Git &&
              x.name === name &&
              x.version === version
          )
        ) {
          return;
        }

        await TauriRouter.add_git_package_to_cache({
          name,
          version,
          isFile: false,
          type: TauriTypes.PackageType.Git,
        });

        newProjectContext.dispatch({
          type: "add_git_package",
          package: {
            id: name,
            url: version,
          },
        });

        props.selectPackage(name, version);
      } catch (e) {
        console.error(e);
        return;
      }

      gitPackageJson.set("");
    }
  }

  function changeTab(newTab: "url" | "manifest") {
    tab.set(newTab);
  }

  return (
    <>
      <div className="flex flex-row pt-2 gap-2">
        <button
          className={`flex justify-between border border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border disabled:cursor-not-allowed disabled:opacity-50 ${
            tab.value === "url" && "bg-sky-600 text-stone-50 border-stone-900"
          }`}
          onClick={() => changeTab("url")}
        >
          Add from URL
        </button>
        <button
          className={`flex justify-between border border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border disabled:cursor-not-allowed disabled:opacity-50 ${
            tab.value === "manifest" &&
            "bg-sky-600 text-stone-50 border-stone-900"
          }`}
          onClick={() => changeTab("manifest")}
        >
          Add from Manifest Entry
        </button>
      </div>

      {tab.value === "url" && (
        <div className="flex pt-2 gap-1 items-center">
          <input
            type="text"
            className="flex-grow rounded-md p-2 bg-stone-800 text-stone-50 border border-stone-600 placeholder:text-stone-400 disabled:opacity-40 disabled:cursor-not-allowed"
            placeholder="com.unity.package"
            value={gitPackageId.value}
            onChange={(e) => gitPackageId.set(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          <input
            type="text"
            className="flex-grow rounded-md p-2 bg-stone-800 text-stone-50 border border-stone-600 placeholder:text-stone-400 disabled:opacity-40 disabled:cursor-not-allowed"
            placeholder="Add a .git URL"
            value={gitPackageUrl.value}
            onChange={(e) => gitPackageUrl.set(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />

          <button
            className="text-stone-300 flex justify-between border border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={addPackage}
            disabled={gitPackageId.value === "" && gitPackageUrl.value === ""}
          >
            Add
          </button>
        </div>
      )}

      {tab.value === "manifest" && (
        <div className="flex pt-2 gap-1 items-center">
          <input
            type="text"
            className="flex-grow rounded-md p-2 bg-stone-800 text-stone-50 border border-stone-600 placeholder:text-stone-400 disabled:opacity-40 disabled:cursor-not-allowed"
            placeholder={`"com.unity.package": "https://github.com/author/package.git"`}
            value={gitPackageJson.value}
            onChange={(e) => gitPackageJson.set(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />

          <button
            className="text-stone-300 flex justify-between border border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={addPackage}
            disabled={gitPackageJson.value === ""}
          >
            Add
          </button>
        </div>
      )}
    </>
  );
}

function LocalAdd(props: {
  selectPackage: (name: string, version?: string) => void;
}) {
  const newProjectContext = useContext(NewProjectContext.Context);
  const localPackage = useBetterState("");

  async function addPackage() {
    if (localPackage.value === "") return;
    if (
      newProjectContext.state.packageInfo.localPackages.some(
        (x) =>
          x.type === TauriTypes.PackageType.Local &&
          x.name === localPackage.value
      )
    ) {
      return;
    }

    await TauriRouter.add_local_package_to_cache({
      name: localPackage.value,
      version: "",
      isFile: false,
      type: TauriTypes.PackageType.Local,
    });

    newProjectContext.dispatch({
      type: "add_local_package",
      package: {
        path: localPackage.value,
      },
    });

    props.selectPackage(localPackage.value, undefined);

    localPackage.set("");
  }

  async function selectPackageFile() {
    const path = await open({
      directory: false,
      multiple: false,
      filters: [{ name: "Package", extensions: ["json"] }],
    });

    if (!path) return;
    const pathStr = path as string;

    if (!pathStr.endsWith("package.json")) {
      return;
    }

    localPackage.set(pathStr);
  }

  return (
    <>
      <div className="flex pt-2 gap-1 items-center">
        <div className="w-full flex flex-col">
          <div className="flex">
            <input
              autoComplete="off"
              spellCheck="false"
              value={localPackage.value}
              onChange={(e) => localPackage.set(e.target.value)}
              placeholder="Add a package.json file path"
              className="flex-grow rounded-md rounded-tr-none rounded-br-none p-2 bg-stone-800 text-stone-50 border border-stone-600 border-r-0 placeholder:text-stone-400 disabled:opacity-40 disabled:cursor-not-allowed"
            />

            <button
              className="hover:text-stone-50 border-stone-600 w-[40px] flex items-center justify-center aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border"
              onClick={() => selectPackageFile()}
            >
              <FolderOpen />
            </button>
          </div>
        </div>

        <button
          className="text-stone-300 flex justify-between border border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={addPackage}
          disabled={localPackage.value === ""}
        >
          Add
        </button>
      </div>
    </>
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
  destroyPackage,
}: {
  package_: {
    package_: TauriTypes.MinimalPackage;
    category?: string;
  };
  onClick?: () => void;
  selected: boolean;
  destroyPackage: (package_: TauriTypes.MinimalPackage) => void;
}) {
  return (
    <div
      className={`flex text-sm font-medium rounded-md border ${
        selected
          ? "border-l-8 border-l-sky-600 text-stone-50 border-sky-600 bg-stone-900"
          : "border-stone-600"
      }`}
    >
      <button
        className={`flex flex-col px-4 py-3 flex-grow ${
          selected ? "" : "hover:bg-stone-800"
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
        {package_.category && (
          <p className="select-none">{package_.category}</p>
        )}
      </button>

      {package_.package_.type === TauriTypes.PackageType.Local ||
        (package_.package_.type === TauriTypes.PackageType.Git && (
          <button
            className="w-10 p-2 bg-red-900 border-l border-stone-600 rounded-md rounded-tl-none rounded-bl-none hover:bg-red-800"
            onClick={() => destroyPackage(package_.package_)}
          >
            <Delete />
          </button>
        ))}
    </div>
  );
}
