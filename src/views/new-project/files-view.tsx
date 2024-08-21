import { useContext, useEffect, useMemo, useRef } from "react";
import { NewProjectContext } from "../../context/new-project-context";
import useBetterState from "../../hooks/useBetterState";
import { getAllFileDirIds, LazyValue, LazyVoid, UseState } from "../../utils";
import { TauriTypes } from "../../utils/tauri-types";
import AsyncLazyValueComponent, {
  AsyncLazyVoidComponent,
} from "../../components/async-lazy-value-component";
import LoadingSpinner from "../../components/svg/loading-spinner";
import { TauriRouter } from "../../utils/tauri-router";
import Checkmark from "../../components/svg/checkmark";
import { Buttons } from "../../components/parts/buttons";
import FolderClosed from "../../components/svg/folder-closed";
import FolderOpen from "../../components/svg/folder-open";

const cannotExclude = ["package.json/", "package.json.meta/"];

export default function FilesView(props: { startAtRoot?: boolean }) {
  const newProjectContext = useContext(NewProjectContext.Context);
  const filesInfo = useMemo(() => {
    return newProjectContext.state.filesInfo;
  }, [newProjectContext.state.filesInfo]);
  const loadingFiles = useBetterState<LazyVoid>({
    status: "loading",
  });
  const isNewFile = useBetterState(false);
  const noDeselectFiles = useBetterState<string[]>([]);

  useEffect(() => {
    newProjectContext.dispatch({
      type: "set_files_no_deselect_files",
      files: noDeselectFiles.value,
    });
  }, [noDeselectFiles.value]);

  function getFileRoot(dir: TauriTypes.FileDir | null) {
    const projectData = props.startAtRoot
      ? dir
      : dir?.children?.find((x) => x.name === "ProjectData~");

    return projectData ?? dir;
  }

  const fileRoot = useMemo(() => {
    const base = filesInfo.root;
    if (!base) {
      return null;
    }

    return getFileRoot(base);
  }, [loadingFiles.value, filesInfo.root]);

  const fileCount = useMemo(() => {
    if (loadingFiles.value.status !== "success") {
      return 0;
    }

    let count = 0;
    function getCount(data: TauriTypes.FileDir | null) {
      if (!data) {
        return;
      }
      if (data.children) {
        data.children.forEach((child) => {
          count++;
          getCount(child);
        });
      }
    }

    getCount(fileRoot);

    let arr: string[] = [];
    function getDeselectFiles(data: TauriTypes.FileDir | null, prefix: string) {
      if (!data) {
        return;
      }
      if (data.children) {
        data.children.forEach((child) => {
          const name = child.name;
          const path = prefix + name + "/";
          if (cannotExclude.includes(path)) {
            arr.push(child.id);
          }
          getDeselectFiles(child, path);
        });
      }
    }

    getDeselectFiles(fileRoot, "");
    noDeselectFiles.set(arr);

    return count;
  }, [loadingFiles.value, filesInfo.root]);

  const fileSelectionCount = useMemo(() => {
    // filter filesInfo.selectedFiles to fileroot
    if (!fileRoot) {
      return 0;
    }

    let count = 0;
    function getCount(data: TauriTypes.FileDir | null) {
      if (!data) {
        return;
      }
      if (data.children) {
        data.children.forEach((child) => {
          if (filesInfo.selectedFiles.includes(child.id)) {
            count++;
          }
          getCount(child);
        });
      }
    }

    getCount(fileRoot);
    return count;
  }, [filesInfo.selectedFiles]);

  useEffect(() => {
    const load = async () => {
      newProjectContext.dispatch({
        type: "set_has_error",
        hasError: true,
      });

      if (!newProjectContext.state.initialTemplateInfo.selectedTemplate) {
        loadingFiles.set({ status: "success" });
        isNewFile.set(false);
        newProjectContext.dispatch({
          type: "set_has_error",
          hasError: false,
        });
        return;
      }

      if (!filesInfo.root) {
        isNewFile.set(true);
        loadingFiles.set({ status: "loading" });

        const newFiles = await TauriRouter.get_template_file_paths(
          newProjectContext.state.initialTemplateInfo.selectedTemplate!
        );

        loadingFiles.set({
          status: "success",
        });
        newProjectContext.dispatch({
          type: "set_files_root",
          root: newFiles,
        });

        newProjectContext.dispatch({
          type: "set_files_selected_files",
          files: [...getAllFileDirIds(newFiles)],
        });
      } else {
        isNewFile.set(false);
        loadingFiles.set({ status: "success" });
      }

      newProjectContext.dispatch({
        type: "set_has_error",
        hasError: false,
      });
    };
    load();
  }, []);

  // useEffect(() => {
  //   if (!isNewFile.value) return;
  //   newProjectContext.dispatch({
  //     type: "set_files_selected_files",
  //     files: [...getAllIds(filesInfo.root)],
  //   });
  // }, [isNewFile.value, filesInfo.root]);

  function selectAll() {
    const workingFiles = getAllFileDirIds(fileRoot);

    const existingFiles = filesInfo.selectedFiles;
    const toSelect = existingFiles
      .concat(workingFiles)
      .filter((x, i, arr) => arr.indexOf(x) === i);

    newProjectContext.dispatch({
      type: "set_files_selected_files",
      files: toSelect,
    });
  }

  function deselectAll() {
    const files = getAllFileDirIds(filesInfo.root).slice(1);
    const workingFiles = getAllFileDirIds(fileRoot).slice(1);

    const existingFiles = filesInfo.selectedFiles;
    const toSelect = existingFiles
      .filter((x) => files.includes(x) && !workingFiles.includes(x))
      .filter((x, i, arr) => arr.indexOf(x) === i);

    newProjectContext.dispatch({
      type: "set_files_selected_files",
      files: toSelect,
    });
  }

  return (
    <div className="flex flex-col h-full py-4 overflow-hidden">
      {/* Browse */}
      {/* <div className="flex justify-center border-b border-stone-700 pb-4">
        <div
          className="border border-stone-600 border-dashed px-8 py-4 flex flex-col gap-4 items-center cursor-pointer hover:bg-stone-800 opacity-20"
          tabIndex={0}
        >
          <div className="text-center select-none">
            Click here to select a new project to
            <br /> work off of instead.
          </div>
          <div className="rounded-md text-stone-50 bg-sky-600 px-3 py-1 select-none">
            Browse
          </div>
        </div>
      </div> */}

      {/* File tree */}
      <AsyncLazyVoidComponent
        loading={
          <div className="w-full h-full flex items-center justify-center">
            <LoadingSpinner />
          </div>
        }
        value={loadingFiles.value}
      >
        {fileCount === 0 && <p className="select-none">No files</p>}
        {fileCount > 0 && (
          <>
            <div className="mb-1">
              <p>
                {fileSelectionCount.toLocaleString()}/
                {fileCount.toLocaleString()} selected
              </p>

              <div className="flex gap-1">
                <Buttons.DefaultButton title="Select All" onClick={selectAll} />

                <Buttons.DefaultButton
                  title="Deselect All"
                  onClick={deselectAll}
                />
              </div>
            </div>

            <div className="tree-root flex flex-col overflow-y-auto">
              {/* Start inside of /package/ */}
              {fileRoot &&
                fileRoot?.children?.map((child) => (
                  <Tree key={child.id} data={child} indent={0} />
                ))}
              {/* {files.value.value &&
                files.value.value.children
                  ?.filter((child) => {
                    child.name.trim() === "ProjectData~";
                  })
                  ?.map((child) => (
                    <Tree key={child.id} data={child} indent={0} />
                  ))} */}
            </div>
          </>
        )}
      </AsyncLazyVoidComponent>
    </div>
  );
}

type SharedProps = {
  // openFolders: UseState<string[]>;
  // selectedFiles: UseState<string[]>;
  // noDeselectFiles: UseState<string[]>;
};

type TreeProps = {
  data: TauriTypes.FileDir;
  indent: number;
} & SharedProps;

function Tree({ data, indent, ...props }: TreeProps) {
  return isFile(data) ? (
    <File key={data.id} data={data} indent={indent} />
  ) : (
    <Folder key={data.id} data={data} indent={indent} />
  );
}

type FolderProps = {
  data: TauriTypes.FileDir;
  indent: number;
} & SharedProps;
function Folder({ data, indent, ...props }: FolderProps) {
  const newProjectContext = useContext(NewProjectContext.Context);
  const filesInfo = useMemo(() => {
    return newProjectContext.state.filesInfo;
  }, [newProjectContext.state.filesInfo]);

  const childrenNodes = useMemo(() => {
    if (!filesInfo.openFolders.includes(data.id)) {
      return null;
    }

    return (
      <>
        {data.children &&
          data.children.length > 0 &&
          data.children?.map((child) => (
            <Tree key={child.id} data={child} indent={indent + 1} />
          ))}

        {data.children?.length === 0 && (
          <p
            style={{ paddingLeft: `${(indent + 1) * 20 + 12}px` }}
            className="tree-item py-1"
          >
            No files
          </p>
        )}
      </>
    );
  }, [filesInfo]);

  const isOpen = useMemo(() => {
    return filesInfo.openFolders.includes(data.id);
  }, [filesInfo.openFolders, data.id]);

  const isSelected = useMemo(() => {
    return filesInfo.selectedFiles.includes(data.id);
  }, [filesInfo.selectedFiles, data.id]);

  const canDeselect = useMemo(() => {
    return !filesInfo.noDeselectFiles.includes(data.id);
  }, [filesInfo.noDeselectFiles, data.id]);

  function toggleFolder() {
    if (isOpen) {
      newProjectContext.dispatch({
        type: "set_files_open_folders",
        folders: filesInfo.openFolders.filter((x) => x !== data.id),
      });
    } else {
      newProjectContext.dispatch({
        type: "set_files_open_folders",
        folders: [...(filesInfo.openFolders ?? []), data.id],
      });
    }
  }

  function toggleSelection() {
    let newFiles = filesInfo.selectedFiles;

    if (isSelected) {
      newFiles = newFiles.filter((x) => x !== data.id);

      // recursively unselect all children
      function disableChildren(dir: TauriTypes.FileDir) {
        if (dir.children) {
          dir.children.forEach((child) => {
            newFiles = newFiles.filter((x) => x !== child.id);
            disableChildren(child);
          });
        }
      }

      disableChildren(data);
    } else {
      newFiles = [...(filesInfo.selectedFiles ?? []), data.id];

      let ids: string[] = [];
      function enableChildren(dir: TauriTypes.FileDir, ids: string[]) {
        if (dir.children) {
          dir.children.forEach((child) => {
            ids.push(child.id);
            enableChildren(child, ids);
          });
        }
      }

      enableChildren(data, ids);
      const selectedFiles = filesInfo.selectedFiles;

      newFiles = newFiles.concat(
        ids.filter((id) => !selectedFiles.includes(id))
      );
    }

    newProjectContext.dispatch({
      type: "set_files_selected_files",
      files: newFiles,
    });
  }

  return (
    <>
      <div
        className={`tree-item flex items-center w-full ${
          isSelected && "selected"
        }`}
      >
        {canDeselect && (
          <CheckBox selected={isSelected} onClick={toggleSelection} />
        )}
        <button
          style={{
            paddingLeft:
              indent !== 0
                ? `calc(${indent * 20 + (!canDeselect ? 30 : 0)}px)`
                : undefined,
          }}
          className="flex items-center px-2 py-1 w-full"
          onClick={toggleFolder}
        >
          {!isOpen && <FolderClosed width={20} height={20} />}
          {isOpen && <FolderOpen width={20} height={20} />}
          <p className="text-left pl-1 font-bold">{data.name}</p>
        </button>
      </div>

      {childrenNodes}
    </>
  );
}

type FileProps = {
  data: TauriTypes.FileDir;
  indent: number;
} & SharedProps;
function File({ data, indent, ...props }: FileProps) {
  const newProjectContext = useContext(NewProjectContext.Context);
  const filesInfo = useMemo(() => {
    return newProjectContext.state.filesInfo;
  }, [newProjectContext.state.filesInfo]);

  const isSelected = useMemo(() => {
    return filesInfo.selectedFiles.includes(data.id);
  }, [filesInfo.selectedFiles, data.id]);

  function toggleSelection() {
    if (isSelected) {
      newProjectContext.dispatch({
        type: "set_files_selected_files",
        files: filesInfo.selectedFiles.filter((x) => x !== data.id),
      });
    } else {
      newProjectContext.dispatch({
        type: "set_files_selected_files",
        files: [...(filesInfo.selectedFiles ?? []), data.id],
      });
    }
  }

  const canDeselect = useMemo(() => {
    return !filesInfo.noDeselectFiles.includes(data.id);
  }, [filesInfo.noDeselectFiles, data.id]);

  return (
    <div
      className={`tree-item tree-item flex items-center w-full ${
        isSelected && "selected"
      }`}
    >
      {canDeselect && (
        <CheckBox selected={isSelected} onClick={toggleSelection} />
      )}
      <button
        style={{ paddingLeft: `${indent * 20 + (!canDeselect ? 30 : 0)}px` }}
        className="tree-item px-2 py-1 w-full"
      >
        <p
          className="text-left"
          style={{ paddingLeft: indent === 0 ? `10px` : `4px` }}
        >
          {data.name}
        </p>
      </button>
    </div>
  );
}

function isFile(node: TauriTypes.FileDir) {
  return node.children?.length === 0 && node.name.includes(".");
}

function CheckBox(props: { selected: boolean; onClick: () => void }) {
  return (
    <button
      className="ml-1 aspect-square rounded-md border border-stone-600"
      onClick={props.onClick}
    >
      <div className="flex items-center justify-center w-[22px] h-[22px]">
        {props.selected && <Checkmark width={16} height={16} />}
      </div>
    </button>
  );
}

// function Node({
//   node,
//   style,
//   dragHandle,
// }: {
//   node: NodeApi<TauriTypes.FileDir>;
//   style: React.CSSProperties;
//   dragHandle: ((el: HTMLDivElement | null) => void) | undefined;
// }) {
//   return (
//     <div
//       style={style}
//       ref={dragHandle}
//       className="flex flex-row items-center gap-2"
//     >
//       <button className="w-6 h-6 border border-stone-700 rounded-md">
//         <div className="">
//           <Checkmark />{" "}
//         </div>
//       </button>{" "}
//       {node.data.name}
//     </div>
//   );
// }

// function Folder({
//   folder,
//   indent,
//   expanded,
//   even,
// }: {
//   folder: TauriTypes.FileDir;
//   indent: number;
//   expanded: boolean;
//   even: boolean;
// }) {
//   const childIndex = useMemo(() => indent + 1, [indent]);
//   const marginLeft = useMemo(() => (indent > 0 ? 20 : 0), [indent]);

//   return (
//     <>
//       <div
//         style={{ marginLeft: `${marginLeft}px` }}
//         className={`w-full ${even ? "bg-stone-600" : "bg-stone-700"}`}
//       >
//         <button className="px-3 py-1 rounded-md border">{folder.name}</button>
//         {expanded &&
//           folder.children.map((child) =>
//             child.name.includes(".") ? (
//               <File key={child.name} file={child} />
//             ) : (
//               <Folder
//                 key={child.name}
//                 folder={child}
//                 indent={childIndex}
//                 expanded={false}
//                 even={!even}
//               />
//             )
//           )}
//       </div>
//     </>
//   );
// }

// function File({ file }: { file: TauriTypes.FileDir }) {
//   return <div style={{ marginLeft: "20px" }}>{file.name}</div>;
// }
