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

const testData: TauriTypes.FileDir = {
  id: "0",
  name: "package",
  children: [
    {
      id: "1",
      name: "Foo",
      children: [
        {
          id: "2",
          name: "a.json",
          children: [],
        },
        {
          id: "3",
          name: "b.json",
          children: [],
        },
      ],
    },
    { id: "4", name: "c.json", children: [] },
    { id: "5", name: "d.json", children: [] },
    { id: "6", name: "e.json", children: [] },
  ],
};

export default function FilesView() {
  const newProjectContext = useContext(NewProjectContext.Context);
  const files = useBetterState<LazyValue<TauriTypes.FileDir>>({
    status: "loading",
    value: null,
  });

  const openFolders = useBetterState<string[]>([]);
  const selectedFiles = useBetterState<string[]>([]);

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
      console.log(newFiles);
    };
    load();
  }, []);

  return (
    <div className="py-4 overflow-hidden">
      <div></div>

      <AsyncLazyValueComponent loading={<LoadingSpinner />} value={files.value}>
        <div className="tree-root flex flex-col h-full overflow-y-auto">
          {files.value.value && (
            <Tree
              data={files.value.value}
              indent={0}
              openFolders={openFolders}
              selectedFiles={selectedFiles}
            />
          )}
        </div>
      </AsyncLazyValueComponent>
    </div>
  );
}

type SharedProps = {
  openFolders: UseState<string[]>;
  selectedFiles: UseState<string[]>;
};

type TreeProps = {
  data: TauriTypes.FileDir;
  skipRoot?: boolean;
  indent: number;
} & SharedProps;

function Tree({ data, indent, ...props }: TreeProps) {
  return isFile(data) ? (
    <File
      data={data}
      indent={indent}
      openFolders={props.openFolders}
      selectedFiles={props.selectedFiles}
    />
  ) : (
    <Folder
      data={data}
      indent={indent}
      openFolders={props.openFolders}
      selectedFiles={props.selectedFiles}
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
            />
          ))}

        {data.children?.length === 0 && (
          <p
            style={{ paddingLeft: `${(indent + 1) * 20}px` }}
            className="tree-item px-2 py-1"
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

  function toggleFolder() {
    if (isOpen) {
      props.openFolders.set(
        props.openFolders.value?.filter((x) => x !== data.id)
      );
    } else {
      props.openFolders.set([...(props.openFolders.value ?? []), data.id]);
    }
  }

  return (
    <>
      <div className="tree-item flex items-center w-full">
        <button className="ml-1 aspect-square rounded-md border border-stone-600">
          <div className="p-1">
            <Checkmark width={16} height={16} />
          </div>
        </button>
        <button
          style={{
            paddingLeft: indent !== 0 ? `calc(${indent * 20}px)` : undefined,
          }}
          className="flex items-center px-2 py-1 w-full"
          onClick={toggleFolder}
        >
          {!isOpen && <ChevronUp width={20} height={20} />}
          {isOpen && <ChevronDown width={20} height={20} />}
          <p className="text-left pl-1">{data.name}</p>
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
function File({ data, indent }: FileProps) {
  return (
    <div className="tree-item tree-item flex items-center w-full">
      <button className="ml-1 aspect-square rounded-md border border-stone-600">
        <div className="p-1">
          <Checkmark width={16} height={16} />
        </div>
      </button>
      <button
        style={{ paddingLeft: `${indent * 20}px` }}
        className="tree-item px-2 py-1 w-full"
      >
        <p className="text-left">{data.name}</p>
      </button>
    </div>
  );
}

function isFile(node: TauriTypes.FileDir) {
  return node.children?.length === 0 && node.name.includes(".");
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
