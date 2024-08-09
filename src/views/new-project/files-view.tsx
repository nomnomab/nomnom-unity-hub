import { useContext, useEffect, useMemo, useRef } from "react";
import { NewProjectContext } from "../../context/new-project-context";
import useBetterState from "../../hooks/useBetterState";
import { LazyValue, UseState } from "../../utils";
import { TauriTypes } from "../../utils/tauri-types";
import AsyncLazyValueComponent from "../../components/async-lazy-value-component";
import LoadingSpinner from "../../components/svg/loading-spinner";
import { TauriRouter } from "../../utils/tauri-router";
import ChevronDown from "../../components/svg/chevron-down";
import ChevronUp from "../../components/svg/chevron-up";
import Checkmark from "../../components/svg/checkmark";
import { Buttons } from "../../components/parts/buttons";

const cannotExclude = ["package.json/", "package.json.meta/"];

export default function FilesView() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const files = useBetterState<LazyValue<TauriTypes.FileDir>>({
    status: "loading",
    value: null,
  });

  const openFolders = useBetterState<string[]>([]);
  const selectedFiles = useBetterState<string[]>([]);
  const noDeselectFiles = useBetterState<string[]>([]);
  const fileCount = useMemo(() => {
    let count =
      (newProjectContext.state.initialTemplateInfo.selectedTemplate && 1) || 0;
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
    getCount(files.value?.value);

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
            console.log("cannot deselect", path, " for", child.id);
            arr.push(child.id);
          }
          getDeselectFiles(child, path);
        });
      }
    }
    getDeselectFiles(files.value?.value, "");
    noDeselectFiles.set(arr);

    return count;
  }, [files.value]);

  function getAllIds(data: TauriTypes.FileDir) {
    const ids = [data.id];
    if (data.children) {
      data.children.forEach((child) => {
        ids.push(...getAllIds(child));
      });
    }
    return ids;
  }

  useEffect(() => {
    const load = async () => {
      if (!newProjectContext.state.initialTemplateInfo.selectedTemplate) {
        files.set({
          status: "success",
          value: {
            id: "0",
            name: "No template selected",
            children: [],
          } as TauriTypes.FileDir,
        });
        return;
      }

      files.set({ status: "loading", value: null });
      const newFiles = await TauriRouter.get_template_file_paths(
        newProjectContext.state.initialTemplateInfo.selectedTemplate!
      );

      files.set({ status: "success", value: newFiles });
      selectedFiles.set([...getAllIds(newFiles)]);
    };
    load();
  }, []);

  return (
    <div className="flex flex-col h-full py-4 overflow-hidden">
      {/* Browse */}
      <div className="flex justify-center border-b border-stone-700 pb-4">
        <div
          className="border border-stone-600 border-dashed px-8 py-4 flex flex-col gap-4 items-center cursor-pointer hover:bg-stone-800"
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
      </div>

      {/* File tree */}
      <AsyncLazyValueComponent loading={<LoadingSpinner />} value={files.value}>
        {(files.value.value?.children?.length ?? 0) === 0 && (
          <p className="pt-4 select-none">No files</p>
        )}
        {(files.value.value?.children?.length ?? 0) > 0 && (
          <>
            <div>
              <p className="pt-4">
                {selectedFiles.value.length.toLocaleString()}/
                {fileCount.toLocaleString()} selected
              </p>

              <Buttons.DefaultButton
                title="Select All"
                onClick={() => {
                  selectedFiles.set([...getAllIds(files.value.value!)]);
                }}
              />

              <Buttons.DefaultButton
                title="Deselect All"
                onClick={() => {
                  selectedFiles.set([]);
                }}
              />
            </div>

            <div className="tree-root flex flex-col overflow-y-auto">
              {/* Start inside of /package/ */}
              {files.value.value &&
                files.value.value?.children?.map((child) => (
                  <Tree
                    key={child.id}
                    data={child}
                    indent={0}
                    openFolders={openFolders}
                    selectedFiles={selectedFiles}
                    noDeselectFiles={noDeselectFiles}
                  />
                ))}
            </div>
          </>
        )}
      </AsyncLazyValueComponent>
    </div>
  );
}

type SharedProps = {
  openFolders: UseState<string[]>;
  selectedFiles: UseState<string[]>;
  noDeselectFiles: UseState<string[]>;
};

type TreeProps = {
  data: TauriTypes.FileDir;
  indent: number;
} & SharedProps;

function Tree({ data, indent, ...props }: TreeProps) {
  return isFile(data) ? (
    <File
      data={data}
      indent={indent}
      openFolders={props.openFolders}
      selectedFiles={props.selectedFiles}
      noDeselectFiles={props.noDeselectFiles}
    />
  ) : (
    <Folder
      data={data}
      indent={indent}
      openFolders={props.openFolders}
      selectedFiles={props.selectedFiles}
      noDeselectFiles={props.noDeselectFiles}
    />
  );
}

type FolderProps = {
  data: TauriTypes.FileDir;
  indent: number;
} & SharedProps;
function Folder({ data, indent, ...props }: FolderProps) {
  const childrenNodes = useMemo(() => {
    if (!props.openFolders.value?.includes(data.id)) {
      return null;
    }

    return (
      <>
        {data.children &&
          data.children.length > 0 &&
          data.children?.map((child) => (
            <Tree
              key={child.id}
              data={child}
              indent={indent + 1}
              openFolders={props.openFolders}
              selectedFiles={props.selectedFiles}
              noDeselectFiles={props.noDeselectFiles}
            />
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
  }, [props.openFolders]);

  const isOpen = useMemo(() => {
    return props.openFolders.value?.includes(data.id);
  }, [props.openFolders, data.id]);

  const isSelected = useMemo(() => {
    return props.selectedFiles.value?.includes(data.id);
  }, [props.selectedFiles, data.id]);

  const canDeselect = useMemo(() => {
    return !props.noDeselectFiles.value.includes(data.id);
  }, [props.noDeselectFiles, data.id]);

  function toggleFolder() {
    if (isOpen) {
      props.openFolders.set(
        props.openFolders.value?.filter((x) => x !== data.id)
      );
    } else {
      props.openFolders.set([...(props.openFolders.value ?? []), data.id]);
    }
  }

  function toggleSelection() {
    if (isSelected) {
      props.selectedFiles.set((s) => s?.filter((x) => x !== data.id));

      // recursively unselect all children
      function disableChildren(dir: TauriTypes.FileDir) {
        if (dir.children) {
          dir.children.forEach((child) => {
            props.selectedFiles.set((s) => s?.filter((x) => x !== child.id));
            disableChildren(child);
          });
        }
      }

      disableChildren(data);
    } else {
      props.selectedFiles.set([...(props.selectedFiles.value ?? []), data.id]);

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
      props.selectedFiles.set((s) => {
        ids = ids.filter((id) => !s?.includes(id));
        return s?.concat(ids);
      });
    }
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
          {!isOpen && <ChevronUp width={20} height={20} />}
          {isOpen && <ChevronDown width={20} height={20} />}
          <p className="text-left pl-1 font-bold">
            {data.name} [{data.id}]
          </p>
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
  const isSelected = useMemo(() => {
    return props.selectedFiles.value?.includes(data.id);
  }, [props.selectedFiles, data.id]);

  function toggleSelection() {
    if (isSelected) {
      props.selectedFiles.set(
        props.selectedFiles.value?.filter((x) => x !== data.id)
      );
    } else {
      props.selectedFiles.set([...(props.selectedFiles.value ?? []), data.id]);
    }
  }

  const canDeselect = useMemo(() => {
    return !props.noDeselectFiles.value.includes(data.id);
  }, [props.noDeselectFiles, data.id]);

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
      <div className="p-1 w-[22px] h-[22px]">
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
