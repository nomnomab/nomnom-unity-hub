import React, { useCallback, useMemo, useState } from "react";
import AsyncComponent from "../../components/async-component";
import { TauriTypes } from "../../utils/tauri-types";
import { TauriRouter } from "../../utils/tauri-router";
import { UseState } from "../../utils";
import EllipsisVertical from "../../components/svg/ellipsis-vertical";
import { Item, Menu, Separator } from "react-contexify";
import { ProjectViewData } from "./projects-view";
import EllipsisHorizontal from "../../components/svg/ellipsis-horizontal";
import LoadingSpinner from "../../components/svg/loading-spinner";

export default function ProjectList({
  projectData,
}: {
  projectData: UseState<ProjectViewData>;
}) {
  return (
    <div className="w-full max-w-6xl self-center overflow-hidden h-full">
      <Pagination projectData={projectData} />
    </div>
  );
}

function Pagination({
  projectData,
}: {
  projectData: UseState<ProjectViewData>;
}) {
  // page settings
  const perPage = 10;
  const buttonCountOneDirection = 2;
  const pageCount = useMemo(() => {
    return Math.floor(projectData.value.projects.length / perPage);
  }, [projectData.value]);

  // load all the projects from a given page
  const loadProjectsOnPage = useCallback(async () => {
    const projects = await TauriRouter.get_projects_on_page(
      projectData.value.currentPage,
      perPage
    );
    projectData.set((s) => ({ ...s, projects: projects }));
  }, [projectData.value.currentPage]);

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

  return (
    <>
      {/* Contents */}
      <div
        className="px-6 py-4 overflow-y-auto"
        style={{
          height: pageCount > 0 ? "calc(100% - 54px)" : undefined,
        }}
      >
        <div className="flex flex-col gap-4">
          <AsyncComponent
            loading={<div>Loading...</div>}
            callback={loadProjectsOnPage}
          >
            {projectData.value.projects.map((x) => (
              <Project key={x.path} project={x} />
            ))}
          </AsyncComponent>
        </div>
      </div>

      {/* Page buttons */}
      {pageCount > 0 && (
        <div className="flex flex-row items-center justify-center gap-2 px-6 py-3 w-full border-t border-t-stone-700">
          {/* First page */}
          {(pageNumbersAroundCurrent.length === 0 ||
            (pageNumbersAroundCurrent.length > 1 &&
              pageNumbersAroundCurrent[0] !== 0)) && (
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
          {pageNumbersAroundCurrent.length > 1 &&
            pageNumbersAroundCurrent[pageNumbersAroundCurrent.length - 1] !==
              pageCount - 1 && (
              <PageButton
                pageNumber={pageCount - 1}
                isSelected={projectData.value.currentPage === pageCount - 1}
                onClick={() => changePage(pageCount - 1)}
              />
            )}
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

function Project({ project }: { project: TauriTypes.Project }) {
  const [isOpening, setIsOpening] = useState(false);

  async function openProject() {
    if (isOpening) return;

    setIsOpening(true);
    await TauriRouter.open_project_in_editor(project.path, project.version);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    setIsOpening(false);
  }

  return (
    <div
      className="flex flex-row items-center gap-4 flex-grow rounded-md p-4 hover:bg-stone-700 transition-colors cursor-pointer"
      tabIndex={0}
      onClick={openProject}
    >
      {isOpening && <LoadingSpinner />}
      {/* Name */}
      <div className="w-4/5">
        <p className="overflow-ellipsis whitespace-nowrap overflow-x-clip text-stone-50 select-none">
          {project.name}
        </p>
        <p className="text-sm overflow-ellipsis whitespace-nowrap overflow-x-clip select-none">
          {project.path}
        </p>
      </div>

      {/* Editor Version */}
      <div className="flex items-center justify-end  ml-auto">
        <p className="overflow-ellipsis whitespace-nowrap overflow-x-clip text-md select-none">
          {project.version}
        </p>
      </div>

      {/* Options */}
      <button
        className="flex items-center justify-center w-12 h-12 aspect-square rounded-md text-stone-50 hover:bg-stone-500"
        // onClick={openOptions}
      >
        <EllipsisVertical width={20} height={20} />
      </button>

      <Menu id={"project-" + project.path} theme="dark_custom">
        <Item
          id="open"
          //onClick={handleItemClick}
        >
          Show in Exporer
        </Item>
        <Separator />
        <Item
          id="remove"
          // onClick={handleItemClick}
        >
          Remove
        </Item>
      </Menu>
    </div>
  );
}
