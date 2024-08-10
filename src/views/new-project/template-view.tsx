import { useCallback, useContext, useEffect, useMemo } from "react";
import useBetterState from "../../hooks/useBetterState";
import { convertBytes, LazyValue, UseState } from "../../utils";
import { TauriTypes } from "../../utils/tauri-types";
import { TauriRouter } from "../../utils/tauri-router";
import AsyncComponent from "../../components/async-component";
import LoadingSpinner from "../../components/svg/loading-spinner";
import AsyncLazyValueComponent from "../../components/async-lazy-value-component";
import TabView from "../../components/tab-view";
import { Buttons } from "../../components/parts/buttons";
import PackagePlus from "../../components/svg/package-plus";
import { NewProjectContext } from "../../context/new-project-context";
import EllipsisVertical from "../../components/svg/ellipsis-vertical";
import { Item, Menu, useContextMenu } from "react-contexify";

const categories = ["All", "Core", "Sample", "Learning", "Custom"];
const defaultUnityPackages = [
  // Core
  {
    id: "com.unity.template.2d",
    name: "2D (Built-in Render Pipeline)",
    category: "Core",
  },
  {
    id: "com.unity.template.2d-cross-platform",
    name: "Universal 2D (URP)",
    category: "Core",
  },
  {
    id: "com.unity.template.3d",
    name: "3D (Built-in Render Pipeline)",
    category: "Core",
  },
  {
    id: "com.unity.template.3d-cross-platform",
    name: "Universal 3D (URP)",
    category: "Core",
  },
  {
    id: "com.unity.template.universal-2d",
    name: "Universal 2D (URP)",
    category: "Core",
  },
  {
    id: "com.unity.template.urp-blank",
    name: "Universal 3D (URP)",
    category: "Core",
  },
  {
    id: "com.unity.template.hdrp-blank",
    name: "High Definition 3D (HDRP)",
    category: "Core",
  },
  {
    id: "com.unity.template.3d-high-end",
    name: "High Definition 3D (HDRP)",
    category: "Core",
  },
  {
    id: "com.unity.template.mobile3d",
    name: "3D Mobile",
    category: "Core",
  },
  {
    id: "com.unity.template.mobile2d",
    name: "2D Mobile",
    category: "Core",
  },
  {
    id: "com.unity.template.mixed-reality",
    name: "Mixed Reality",
    category: "Core",
  },
  {
    id: "com.unity.template.vr",
    name: "VR",
    category: "Core",
  },
  {
    id: "com.unity.template.ar-mobile",
    name: "AR Mobile",
    category: "Core",
  },
  {
    id: "com.unity.template.multiplayer-ngo",
    name: "Small Scale Competitive Multiplayer",
    category: "Core",
  },
  // Sample
  {
    id: "com.unity.template.urp-sample",
    name: "Universal 3D (URP) Sample",
    category: "Sample",
  },
  {
    id: "com.unity.template.hd",
    name: "High Definition (HDRP) 3D Sample",
    category: "Sample",
  },
  {
    id: "com.unity.template.vr-multiplayer",
    name: "VR Multiplayer",
    category: "Sample",
  },
  {
    id: "com.unity.template.cinematic-studio-sample",
    name: "Cinematic Studio",
    category: "Sample",
  },
  // Learning
  {
    id: "com.unity.template.platformer",
    name: "2D Platformer Microgame",
    category: "Learning",
  },
  {
    id: "com.unity.template.fps",
    name: "FPS Microgame",
    category: "Learning",
  },
];

function tryGetDefaultUnityPackage(name: string):
  | {
      id: string;
      name: string;
      category: string;
    }
  | undefined {
  return defaultUnityPackages.find((x) => x.id == name);
}

export default function TemplateView() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const initialTemplateInfo = useMemo(() => {
    return newProjectContext.state.initialTemplateInfo;
  }, [newProjectContext.state.initialTemplateInfo]);

  const searchQuery = useBetterState("");
  const selectedCategory = useBetterState("");
  const surfaceTemplates = useBetterState<TauriTypes.SurfaceTemplate[]>([]);
  // const selectedTemplate = useBetterState<string | null>(null);
  const selectedTgzJson = useBetterState<
    LazyValue<TauriTypes.TgzPackageJsonRecord>
  >({
    status: "loading",
    value: null,
  });

  useEffect(() => {
    newProjectContext.dispatch({
      type: "set_initial_template",
      template: undefined,
    });
  }, [initialTemplateInfo.editorVersion]);

  const loadSurfacePackages = useCallback(async () => {
    const editorVersion = initialTemplateInfo.editorVersion;
    const templates = await TauriRouter.get_surface_templates(
      editorVersion.version
    );
    selectTemplate(undefined);
    surfaceTemplates.set(templates);
  }, [initialTemplateInfo.editorVersion]);

  const queriedPackages = useMemo(() => {
    return surfaceTemplates.value
      .map((x) => ({
        found: tryGetDefaultUnityPackage(x.name),
        x,
      }))
      .filter((x) =>
        (x.found?.name ?? x.x.name)
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase())
      )
      .filter(
        (x) =>
          selectedCategory.value === "All" ||
          (x.found?.category ?? "Custom") === selectedCategory.value
      )
      .map((x) => {
        return {
          _template: x.x,
          name: x.found?.name,
          category: x.found?.category ?? "Custom",
        };
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
      .sort((a, b) => {
        if (a.category === "Custom") return 1;
        if (b.category === "Custom") return -1;
        return 0;
      });
  }, [surfaceTemplates.value, searchQuery.value, selectedCategory.value]);

  const selectedPackageWrapper = useMemo(() => {
    const selectedTemplate = initialTemplateInfo.selectedTemplate;
    if (!selectedTemplate) return null;

    const p = tryGetDefaultUnityPackage(selectedTemplate.name);
    return {
      _template: selectedTemplate!,
      name: p?.name,
      category: p?.category ?? "Custom",
    };
  }, [initialTemplateInfo.selectedTemplate]);

  useEffect(() => {
    selectedCategory.set(categories[0]);
  }, []);

  function selectTemplate(x?: TauriTypes.SurfaceTemplate) {
    newProjectContext.dispatch({
      type: "set_initial_template",
      template: x,
    });

    newProjectContext.dispatch({
      type: "set_packages",
      packages: [],
    });
  }

  return (
    <div className="flex h-full">
      <Sidebar categories={categories} selectedCategory={selectedCategory} />
      <div className="px-4 pt-4 w-full flex flex-col overflow-y-auto">
        <AsyncComponent
          loading={<LoadingSpinner />}
          callback={loadSurfacePackages}
        >
          <input
            type="search"
            className="rounded-md p-2 bg-stone-800 text-stone-50 border border-stone-600 placeholder:text-stone-400"
            placeholder="Search for a template"
            value={searchQuery.value}
            onChange={(e) => searchQuery.set(e.target.value)}
          />

          <div className="flex flex-col gap-2 py-3 w-full">
            {queriedPackages.map((x, i) => (
              <Template
                key={i}
                value={x}
                onClick={() => selectTemplate(x._template)}
                selected={
                  initialTemplateInfo.selectedTemplate?.name ===
                  x._template.name
                }
              />
            ))}
          </div>
        </AsyncComponent>
      </div>
      {selectedPackageWrapper && (
        <TemplateInfo
          value={selectedPackageWrapper}
          tgzJson={selectedTgzJson}
          loadSurfacePackages={loadSurfacePackages}
        />
      )}
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

  function useEmptyTemplate() {
    newProjectContext.dispatch({
      type: "set_initial_template",
      template: undefined,
    });

    newProjectContext.dispatch({
      type: "set_packages",
      packages: [],
    });

    newProjectContext.dispatch({
      type: "change_tab",
      tab: "package",
    });
  }

  return (
    <div className="flex flex-col w-48 gap-2 border-r border-r-stone-700 pr-4 pt-4 overflow-y-auto flex-shrink-0">
      <button
        className="flex justify-between border bg-stone-800 border-stone-700 px-3 py-2 rounded-md hover:bg-stone-700 select-none cursor-pointer box-border"
        onClick={useEmptyTemplate}
      >
        <div className="flex items-center gap-2">
          <PackagePlus width={20} height={20} />
          <span>Start Empty</span>
        </div>
      </button>
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
    </div>
  );
}

function Template({
  value,
  onClick,
  selected,
}: {
  value: {
    _template: TauriTypes.SurfaceTemplate;
    name: string | undefined;
    category: string | undefined;
  };
  onClick?: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={`flex flex-wrap px-4 py-3 text-sm font-medium rounded-md border ${
        selected
          ? "border-l-8 border-l-sky-600 text-stone-50 border-sky-600 bg-stone-900"
          : "border-stone-600 hover:bg-stone-800"
      }`}
      onClick={onClick}
    >
      <p className="flex basis-full text-stone-50 select-none">
        {value.name ?? value._template.name}{" "}
        <span
          className={`ml-auto ${selected ? "text-stone-50" : "text-stone-400"}`}
        >
          {value._template.version}
        </span>
      </p>
      {value.category && <p className="select-none">{value.category}</p>}
      {/* {value.isPinned && <p>Pinned</p>} */}
    </button>
  );
}

function TemplateInfo({
  value,
  tgzJson,
  loadSurfacePackages,
}: {
  value: {
    _template: TauriTypes.SurfaceTemplate;
    name: string | undefined;
    category: string | undefined;
  };
  tgzJson: UseState<LazyValue<TauriTypes.TgzPackageJsonRecord>>;
  loadSurfacePackages: () => void;
}) {
  const newProjectContext = useContext(NewProjectContext.Context);
  const initialTemplateInfo = useMemo(() => {
    return newProjectContext.state.initialTemplateInfo;
  }, [newProjectContext.state.initialTemplateInfo]);

  useEffect(() => {
    const load = async () => {
      tgzJson.set({ status: "loading", value: null });
      const json = await TauriRouter.get_template_information(value._template);
      tgzJson.set({ status: "success", value: json });
      newProjectContext.dispatch({
        type: "set_packages",
        packages: Object.keys(json.tgzPackage.dependencies ?? {}) ?? [],
      });

      newProjectContext.dispatch({
        type: "reset_files",
      });
    };

    load();
  }, [initialTemplateInfo.selectedTemplate, value]);

  const tabs = [
    { id: "info", title: "Info" },
    { id: "packages", title: "Packages" },
  ];

  const selectedTab = useBetterState<string | number>(tabs[0].id);

  const { show, hideAll } = useContextMenu({});
  function pressMenuItem({ id, event, _ }: any) {
    event.stopPropagation();

    switch (id) {
      case "open":
        TauriRouter.show_path_in_file_manager(value._template.path);
        break;
      case "delete":
        TauriRouter.delete_template(
          value._template,
          newProjectContext.state.initialTemplateInfo.editorVersion.version
        ).then(loadSurfacePackages);
        break;
    }

    hideAll();
  }

  return (
    <div className="flex flex-col w-96 gap-4 pt-4 border-l border-l-stone-700 overflow-y-auto flex-shrink-0">
      {/* <div className="border-b border-b-stone-700 px-4 pb-4"> */}
      <div className="px-4">
        <div className="flex">
          <p className="text-stone-50">
            {value.name ??
              tgzJson.value?.value?.tgzPackage?.name ??
              value._template.name}
          </p>
          <button
            className="ml-auto p-1 rounded-md hover:bg-stone-700"
            onClick={(e) => show({ id: "template", event: e })}
          >
            <EllipsisVertical width={20} height={20} />
          </button>
        </div>
        <p className="leading-6">
          {tgzJson.value?.status === "loading"
            ? "Loading..."
            : tgzJson.value?.value?.tgzPackage.description ?? "No description"}
        </p>
      </div>
      <div className="flex flex-col gap-3 pb-2">
        <AsyncLazyValueComponent
          loading={
            <div className="px-4">
              <LoadingSpinner />
            </div>
          }
          value={tgzJson.value}
        >
          <TabView
            selectedTab={selectedTab}
            tabs={tabs}
            className="flex flex-row gap-2 px-4"
            tabClassName="rounded-md px-3 py-1 border select-none text-stone-50"
          />
          <div className="flex flex-col px-4 gap-3">
            {selectedTab.value === "info" && (
              <>
                {/* Render Pipelines */}
                <div>
                  <p className="text-stone-400 text-sm">
                    Render Pipelines Found
                  </p>
                  {tgzJson.value?.value?.pipelines?.length === 0 ? (
                    <p>None</p>
                  ) : (
                    <p>
                      {tgzJson.value?.value?.pipelines?.join(", ") ?? "None"}
                    </p>
                  )}
                </div>

                {/* Size */}
                <div>
                  <p className="text-stone-400 text-sm">Size</p>
                  <p>
                    {tgzJson.value?.value?.diskSizeBytes
                      ? convertBytes(tgzJson.value?.value?.diskSizeBytes ?? 0)
                      : "-"}
                  </p>
                </div>

                {/* Platforms */}
                <div>
                  <p className="text-stone-400 text-sm">Platforms</p>
                  <p className="text-stone-500">Not Implemented</p>
                </div>

                {/* Category */}
                <div>
                  <p className="text-stone-400 text-sm">Category</p>
                  <p>{value.category ?? "None"}</p>
                </div>
              </>
            )}

            {selectedTab.value === "packages" && (
              <>
                {tgzJson.value?.value?.tgzPackage?.dependencies && (
                  <div>
                    {Object.keys(
                      tgzJson.value?.value?.tgzPackage?.dependencies
                    ).map((x) => (
                      <div
                        key={x}
                        className="flex justify-between text-sm leading-6"
                      >
                        <span className="w-10/12 overflow-hidden">{x}</span>{" "}
                        <span className="text-stone-400">
                          {tgzJson.value?.value?.tgzPackage?.dependencies?.[x]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </AsyncLazyValueComponent>
      </div>

      <Menu id="template" theme="dark_custom">
        <Item id="open" onClick={pressMenuItem}>
          Open in Explorer
        </Item>

        {value.category === "Custom" && (
          <Item id="delete" onClick={pressMenuItem}>
            Delete
          </Item>
        )}
      </Menu>
    </div>
  );
}
