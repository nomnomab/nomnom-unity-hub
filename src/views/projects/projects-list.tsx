import React, { useCallback, useEffect, useMemo, useState } from "react";
import AsyncComponent from "../../components/async-component";
import { TauriTypes } from "../../utils/tauri-types";
import { TauriRouter } from "../../utils/tauri-router";
import { UseState } from "../../utils";
import EllipsisVertical from "../../components/svg/ellipsis-vertical";
import {
  Item,
  Menu,
  Separator,
  Submenu,
  TriggerEvent,
  useContextMenu,
} from "react-contexify";
import { ProjectViewData } from "./projects-view";
import LoadingSpinner from "../../components/svg/loading-spinner";
import useBetterState from "../../hooks/useBetterState";
import Box from "../../components/svg/box";
import Pin from "../../components/svg/pin";
import { Buttons } from "../../components/parts/buttons";
import Sort from "../../components/svg/sort";

export default function ProjectList({
  projectData,
}: {
  projectData: UseState<ProjectViewData>;
}) {
  return (
    <>
      <Pagination projectData={projectData} />
    </>
  );
}

const perPage = 10;
const buttonCountOneDirection = 2;

function Pagination({
  projectData,
}: {
  projectData: UseState<ProjectViewData>;
}) {
  // page settings
  const reloadPage = useBetterState(false);
  const editors = useBetterState<TauriTypes.UnityEditorInstall[] | null>(null);
  const searchQuery = useBetterState<string | undefined>(undefined);

  const sortType = useBetterState<TauriTypes.SortType>(
    TauriTypes.SortType.DateAdded
  );

  useEffect(() => {
    TauriRouter.get_prefs().then((prefs) => {
      const newSortType: TauriTypes.SortType =
        prefs.projectSortType ?? TauriTypes.SortType.DateAdded;
      sortType.set(newSortType);
    });
  }, []);

  const pageCount = useMemo(() => {
    return Math.ceil(
      projectData.value.allProjects.filter((x) =>
        x.name.toLowerCase().includes(searchQuery.value?.toLowerCase() || "")
      ).length / perPage
    );
  }, [projectData.value]);

  // load all the projects from a given page
  const loadProjectsOnPage = useCallback(async () => {
    if (reloadPage.value) {
      reloadPage.set(false);
      return;
    }

    await TauriRouter.remove_missing_projects();
    const allProjects = await TauriRouter.get_projects();
    projectData.set((s) => ({ ...s, allProjects }));

    // await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const projects = await TauriRouter.get_projects_on_page(
        projectData.value.currentPage,
        perPage,
        {
          nameFilter: searchQuery.value === "" ? undefined : searchQuery.value,
          // sortBy: sortType.value,
        }
      );
      console.log(projects);
      projectData.set((s) => ({
        ...s,
        projects,
      }));
    } catch (e) {
      console.error(e);
    }
  }, [
    projectData.value.currentPage,
    reloadPage.value,
    searchQuery.value,
    sortType.value,
  ]);

  function changePage(page: number) {
    projectData.set((s) => ({ ...s, currentPage: page }));
  }

  // get page numbers around the current number
  // so that you always have a padded margin of options
  // and always show the first and last button where available
  const pageNumbersAroundCurrent = useMemo(() => {
    const page = projectData.value.currentPage;

    let start = page - buttonCountOneDirection;
    let end = page + buttonCountOneDirection;

    if (start <= 0) {
      end += Math.max(0, -(start - 1));
    }

    if (end >= pageCount - 1) {
      start -= Math.max(0, end - (pageCount - 1 - 1));
    }

    start = Math.max(0, start);
    end = Math.min(pageCount - 1, end);

    start = Math.max(0, start);
    end = Math.min(pageCount - 1, end);

    const numbers = [];
    for (let i = start; i <= end; i++) {
      if (i === 0) continue;
      if (i === pageCount - 1) continue;
      numbers.push(i);
    }

    return numbers;
  }, [pageCount, projectData.value.currentPage]);

  useEffect(() => {
    const load = async () => {
      editors.set(null);
      const newEditors = await TauriRouter.get_editors();
      const userCache = await TauriRouter.get_user_cache();
      editors.set(newEditors);
    };
    load();
  }, []);

  const showFirstButton = useMemo(() => {
    if (pageCount > 0) {
      return true;
    }

    return (
      pageNumbersAroundCurrent.length === 0 ||
      (pageNumbersAroundCurrent.length > 1 && pageNumbersAroundCurrent[0] !== 0)
    );
  }, [pageNumbersAroundCurrent.length, pageCount]);

  const showLastButton = useMemo(() => {
    if (pageCount > 1 && pageNumbersAroundCurrent.length === 0) {
      return true;
    }

    return (
      pageNumbersAroundCurrent.length > 0 &&
      pageNumbersAroundCurrent[pageNumbersAroundCurrent.length - 1] !==
        pageCount - 1
    );
  }, [pageNumbersAroundCurrent.length, pageCount]);

  const { show, hideAll } = useContextMenu({
    id: "projects_sort",
  });

  function openSortMenu(event: TriggerEvent) {
    event.stopPropagation();
    show({
      id: "projects_sort",
      event,
      props: {},
    });
  }

  function handleItemClick({ id, event, data }: any) {
    event.stopPropagation();
    hideAll();
    TauriRouter.set_pref_value(
      TauriTypes.PrefsKey.ProjectSortType,
      id as TauriTypes.SortType
    ).then(() => sortType.set(id));
  }

  return (
    <>
      <div className="p-4 flex mt-2 gap-2">
        <input
          type="search"
          className="rounded-md p-2 bg-stone-800 text-stone-50 border border-stone-600 placeholder:text-stone-400 w-full"
          placeholder="Search for a project"
          value={searchQuery.value ?? ""}
          onChange={(e) => searchQuery.set(e.target.value)}
        />

        {/* sort dropdown */}
        <button
          className="rounded-md text-stone-50 px-3 py-1 select-none disabled:cursor-not-allowed disabled:opacity-50 hover:bg-stone-800 transition-colors"
          onClick={openSortMenu}
        >
          <Sort />
        </button>

        <Menu id="projects_sort" theme="dark_custom">
          {["Date Added", "Name", "Date Opened", "Editor Version"].map(
            (value) => (
              <Item
                id={value.replace(" ", "")}
                onClick={handleItemClick}
                className={
                  sortType.value === value.replace(" ", "")
                    ? "bg-sky-600 rounded-md"
                    : ""
                }
              >
                {value}
              </Item>
            )
          )}
        </Menu>
      </div>

      <AsyncComponent
        loading={
          <div className="w-full h-full flex items-center justify-center animate-pulse transition-all">
            <LoadingSpinner />
          </div>
        }
        callback={loadProjectsOnPage}
      >
        {/* Contents */}
        <div
          className="px-4 pb-6 overflow-y-auto relative"
          style={{
            height:
              pageCount > 1 ? "calc(100% - 54px - 75px)" : "calc(100% - 75px)",
          }}
        >
          <div className="flex flex-col gap-2 py-1">
            {projectData.value.projects.length === 0 && (
              <p className="select-none p-2">No projects to show</p>
            )}
            {projectData.value.projects.map((x) => (
              <Project
                key={x.path}
                project={x}
                reloadPage={() => reloadPage.set(true)}
                editors={editors.value}
              />
            ))}
          </div>
        </div>
      </AsyncComponent>

      {/* Page buttons */}
      {pageCount > 1 && (
        <div className="flex flex-row items-center justify-center gap-2 px-6 py-3 w-full border-t border-t-stone-700">
          {/* First page */}
          {showFirstButton && (
            <PageButton
              pageNumber={0}
              isSelected={projectData.value.currentPage === 0}
              onClick={() => changePage(0)}
            />
          )}

          {/* Middle pages */}
          {pageNumbersAroundCurrent.map((x) => (
            <PageButton
              key={x}
              pageNumber={x}
              isSelected={projectData.value.currentPage === x}
              onClick={() => changePage(x)}
            />
          ))}

          {/* Last page */}
          {showLastButton && (
            <PageButton
              pageNumber={pageCount - 1}
              isSelected={projectData.value.currentPage === pageCount - 1}
              onClick={() => changePage(pageCount - 1)}
            />
          )}
          {/* {pageNumbersAroundCurrent.length > 1 &&
            pageNumbersAroundCurrent[pageNumbersAroundCurrent.length - 1] !==
              pageCount - 1 && (
              <PageButton
                pageNumber={pageCount - 1}
                isSelected={projectData.value.currentPage === pageCount - 1}
                onClick={() => changePage(pageCount - 1)}
              />
            )} */}
        </div>
      )}
    </>
  );
}

function PageButton({
  pageNumber,
  isSelected,
  ...props
}: {
  pageNumber: number;
  isSelected: boolean;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex justify-center items-center rounded-md px-3 py-1 border text-sm select-none w-[30px] overflow-visible aspect-square text-center ${
        isSelected
          ? "bg-sky-600 text-stone-50 border-stone-900 hover:bg-sky-600 hover:text-stone-50"
          : "text-stone-50 border-stone-600 hover:bg-stone-600 hover:text-stone-50"
      }
            `}
    >
      {pageNumber + 1}
    </button>
  );
}

function Project({
  project,
  ...props
}: {
  project: TauriTypes.Project;
  editors: TauriTypes.UnityEditorInstall[] | null;
  reloadPage: () => void;
}) {
  const [isOpening, setIsOpening] = useState(false);
  const { show, hideAll } = useContextMenu({});
  const thumbnailPath = useBetterState<string | null>(null);

  async function openProject() {
    if (isOpening) return;

    setIsOpening(true);
    await TauriRouter.open_project_in_editor(project.path, project.version);
    props.reloadPage();
    await new Promise((resolve) => setTimeout(resolve, 4000));
    setIsOpening(false);
  }

  function openOptions(event: TriggerEvent) {
    event.stopPropagation();
    show({
      id: "project-" + project.path,
      event,
      props: {},
    });
  }

  function handleItemClick({ id, event, data }: any) {
    event.stopPropagation();
    hideAll();
    switch (id) {
      case "open":
        TauriRouter.show_path_in_file_manager(project.path);
        break;
      case "remove":
        TauriRouter.remove_project(project.path);
        props.reloadPage();
        break;
      case "version":
        TauriRouter.change_project_editor_version(project.path, data).then(() =>
          props.reloadPage()
        );
        break;
      case "pin":
        TauriRouter.pin_project(project.path)
          .then(() => props.reloadPage())
          .catch((err) => console.error(err));
        break;
      case "unpin":
        TauriRouter.unpin_project(project.path)
          .then(() => props.reloadPage())
          .catch((err) => console.error(err));
        break;
    }
  }

  useEffect(() => {
    TauriRouter.fetch_project_thumbnail(project.path)
      .then((path) => {
        thumbnailPath.set(path);
      })
      .catch((err) => {
        thumbnailPath.set(null);
      });
  }, [project.path]);

  return (
    <div
      className="flex flex-row items-center gap-4 flex-grow rounded-md p-2 hover:bg-stone-700 transition-colors cursor-pointer"
      tabIndex={0}
      onClick={openProject}
    >
      {isOpening && <LoadingSpinner />}
      <div className="h-[42px] aspect-square select-none bg-stone-800 rounded-md">
        {!thumbnailPath.value && (
          <div className="flex items-center justify-center aspect-square p-2 w-full h-full">
            <Box />
          </div>
        )}
        {thumbnailPath.value && (
          <img
            className="rounded-md object-cover h-full w-full"
            src={thumbnailPath.value}
            alt="N/A"
            loading="lazy"
          />
        )}
      </div>
      {/* Name */}
      <div className="flex-grow overflow-hidden">
        <p className="overflow-ellipsis whitespace-nowrap text-stone-50 select-none relative">
          {project.name}{" "}
          {project.isPinned && (
            <Pin
              className="inline rotate-45 absolute top-1 ml-1"
              width={16}
              height={16}
            />
          )}
        </p>
        <p className="overflow-hidden text-ellipsis whitespace-nowrap text-sm select-none">
          {project.path}
        </p>
      </div>

      <div className="flex w-1/5 h-[42px] items-center">
        {/* Editor Version */}
        <div className="flex items-center justify-end ml-auto">
          <p className="overflow-ellipsis whitespace-nowrap overflow-x-clip text-md select-none pr-3">
            {project.version}
          </p>
        </div>

        {/* Options */}
        <button
          className="flex items-center justify-center h-full aspect-square rounded-md text-stone-50 hover:bg-stone-500"
          onClick={openOptions}
        >
          <EllipsisVertical width={22} height={22} />
        </button>
      </div>

      <Menu id={"project-" + project.path} theme="dark_custom">
        {!project.isPinned && (
          <Item id="pin" onClick={handleItemClick}>
            Add to Favorites
          </Item>
        )}
        {project.isPinned && (
          <Item id="unpin" onClick={handleItemClick}>
            Remove from Favorites
          </Item>
        )}
        <Separator />
        <Item id="open" onClick={handleItemClick}>
          Show in Exporer
        </Item>
        <Submenu label="Change Version">
          {props.editors?.map((x) => (
            <Item
              key={x.exePath}
              id="version"
              data={x.version}
              onClick={handleItemClick}
            >
              {x.version}
            </Item>
          ))}
        </Submenu>
        <Separator />
        <Item id="remove" onClick={handleItemClick}>
          Remove
        </Item>
      </Menu>
    </div>
  );
}
