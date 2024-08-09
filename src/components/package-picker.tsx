// import { useState } from "react";
// import LoadingSpinner from "./svg/loading-spinner";
// import { LazyValue } from "../utils";
// import { Template } from "../context/global-context";
// import { invoke } from "@tauri-apps/api/tauri";
// import Delete from "./svg/delete";

// export type PackagePickerState = {
//   template: LazyValue<Template>;
//   selectedPackages: string[];
//   showTemplateDropdown?: boolean;
// };

// type Props = {
//   state: PackagePickerState;
//   setState: React.Dispatch<React.SetStateAction<PackagePickerState>>;
// };

// export default function PackagePicker({ state, setState }: Props) {
//   const [gitPackage, setGitPackage] = useState("");
//   const [normalPackage, setNormalPackage] = useState({
//     name: "",
//     version: "",
//   });
//   const [loadingGitPackage, setLoadingGitPackage] = useState<LazyValue<string>>(
//     {
//       status: "idle",
//       value: null,
//     }
//   );

//   if (state.template?.status === "loading") {
//     return <LoadingSpinner />;
//   }

//   const template = state.template?.value;

//   function selectPackage(x: string) {
//     setState((s) => ({
//       ...s,
//       selectedPackages: s.selectedPackages.includes(x)
//         ? s.selectedPackages.filter((y) => y !== x)
//         : [...s.selectedPackages, x],
//     }));
//   }

//   function isSelected(x: string) {
//     return state.selectedPackages.includes(x);
//   }

//   function selectAll() {
//     setState((s) => ({
//       ...s,
//       selectedPackages: selectAllDependencies(s.template),
//     }));
//   }

//   function selectNone() {
//     setState((s) => ({
//       ...s,
//       selectedPackages: [],
//     }));
//   }

//   async function addGitPackage() {
//     if (hasDependency(state.template?.value, gitPackage)) {
//       return;
//     }

//     if (state.template?.value?.dependencies !== undefined) {
//       setLoadingGitPackage({ status: "loading", value: null });

//       const json: {
//         name: string;
//         version: string;
//       } = await invoke("get_git_package_json", { url: gitPackage });

//       setState({
//         ...state,
//         template: {
//           ...state.template,
//           value: {
//             ...state.template.value,
//             dependencies: {
//               ...state.template.value.dependencies,
//               custom: {
//                 ...state.template.value.dependencies.custom,
//                 [json.name]: {
//                   version: json.version,
//                   gitUrl: gitPackage,
//                 },
//               },
//             },
//           },
//         },
//         selectedPackages: [...state.selectedPackages, json.name],
//       });

//       setGitPackage("");
//       setLoadingGitPackage({ status: "idle", value: null });
//     }
//   }

//   function addNormalPackage() {
//     if (hasDependency(state.template?.value, normalPackage.name)) {
//       return;
//     }

//     setNormalPackage({
//       name: "",
//       version: "",
//     });

//     setState({
//       ...state,
//       template: {
//         status: "idle",
//         value: {
//           ...state.template.value!,
//           dependencies: {
//             ...state.template.value!.dependencies,
//             custom: {
//               ...state.template.value!.dependencies.custom,
//               [normalPackage.name]: {
//                 version: normalPackage.version,
//               },
//             },
//           },
//         },
//       },
//     });
//   }

//   function deletePackage(x: string) {
//     setState({
//       ...state,
//       selectedPackages: state.selectedPackages.filter((y) => y !== x),
//       template: {
//         ...state.template,
//         value: {
//           ...state.template.value!,
//           dependencies: {
//             ...state.template.value!.dependencies,
//             custom: {
//               ...Object.keys(state.template.value!.dependencies.custom)
//                 .filter((y) => y !== x)
//                 .reduce(
//                   (acc, y) => ({
//                     ...acc,
//                     [y]: state.template.value!.dependencies.custom[y],
//                   }),
//                   {}
//                 ),
//             },
//           },
//         },
//       },
//     });
//   }

//   return (
//     <>
//       <div className="flex gap-2">
//         <p className="text-lg text-stone-50 select-none">
//           Packages{" "}
//           <span className="text-stone-400">
//             ({state.selectedPackages.length})
//           </span>
//         </p>
//         <button
//           className="ml-auto rounded-md bg-stone-700 text-stone-50 px-3 py-1 select-none disabled:opacity-50 disabled:cursor-not-allowed"
//           onClick={selectAll}
//           disabled={
//             Object.keys(state.template?.value?.dependencies ?? {}).length === 0
//           }
//         >
//           Select All
//         </button>
//         <button
//           className="rounded-md bg-stone-700 text-stone-50 px-3 py-1 select-none disabled:opacity-50 disabled:cursor-not-allowed"
//           onClick={selectNone}
//           disabled={state.selectedPackages.length === 0}
//         >
//           Select None
//         </button>
//       </div>

//       <div className="flex flex-col gap-2 select-none">
//         <p>Internal</p>
//         {Object.keys(state.template?.value?.dependencies.internal || {})
//           .length === 0 && (
//           <p className="text-stone-400">No internal dependencies</p>
//         )}
//         {Object.keys(state.template?.value?.dependencies.internal || {})
//           .sort()
//           .map((x) => {
//             const dep = getDependency(template, x);
//             if (!dep) return null;

//             return (
//               <div key={x} className="flex flex-col">
//                 <div
//                   className={`rounded-md flex px-6 py-3 border text-sm cursor-pointer transition-colors gap-1 ${
//                     isSelected(x)
//                       ? "border-sky-600 text-stone-50 hover:bg-sky-800"
//                       : "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
//                   }`}
//                   onClick={() => selectPackage(x)}
//                 >
//                   <p>{x}</p>
//                   <p className="ml-auto text-ellipsis overflow-hidden max-w-32 whitespace-nowrap">
//                     {dep.version}
//                   </p>
//                 </div>
//               </div>
//             );
//           })}

//         <p>Custom</p>
//         {Object.keys(state.template?.value?.dependencies.custom || {})
//           .length === 0 && (
//           <p className="text-stone-400">No custom dependencies</p>
//         )}
//         {Object.keys(state.template?.value?.dependencies.custom || {})
//           .sort()
//           .map((x) => {
//             const dep = getDependency(template, x);
//             if (!dep) return null;

//             return (
//               <div key={x} className="flex flex-row">
//                 <div
//                   className={`rounded-md rounded-tr-none rounded-br-none flex px-6 py-3 border border-r-0 text-sm cursor-pointer transition-colors gap-1 flex-grow ${
//                     isSelected(x)
//                       ? "border-sky-600 text-stone-50 hover:bg-sky-800"
//                       : "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
//                   }`}
//                   onClick={() => selectPackage(x)}
//                 >
//                   <p>{x}</p>
//                   <p className="ml-auto text-ellipsis overflow-hidden max-w-32 whitespace-nowrap">
//                     {dep.version}
//                   </p>
//                 </div>
//                 <button
//                   className={`flex items-center justify-center w-[40px] h-[40px] aspect-square rounded-md rounded-tl-none rounded-bl-none text-stone-50 hover:bg-stone-500 p-2 border ${
//                     isSelected(x)
//                       ? "border-sky-600 text-stone-50 hover:bg-sky-800"
//                       : "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
//                   }`}
//                   onClick={() => deletePackage(x)}
//                 >
//                   <Delete />
//                 </button>
//               </div>
//             );
//           })}
//       </div>

//       <p className="mt-6 select-none">Add package</p>
//       <div className="flex mt-1">
//         <input
//           type="text"
//           placeholder="name"
//           value={normalPackage.name}
//           className="w-6/12 p-2 rounded-md rounded-tr-none rounded-br-none border border-stone-600 border-r-0 bg-stone-800"
//           onChange={(e) => {
//             setNormalPackage({ ...normalPackage, name: e.target.value });
//           }}
//           disabled={loadingGitPackage.status === "loading"}
//         />

//         <input
//           type="text"
//           placeholder="version"
//           value={normalPackage.version}
//           className="w-6/12 p-2 rounded-md rounded-tl-none rounded-bl-none border border-stone-600 bg-stone-800"
//           onChange={(e) => {
//             setNormalPackage({ ...normalPackage, version: e.target.value });
//           }}
//           disabled={loadingGitPackage.status === "loading"}
//         />

//         <button
//           className="rounded-md bg-stone-700 text-stone-50 px-3 py-1 ml-2 select-none disabled:cursor-not-allowed disabled:opacity-50"
//           onClick={addNormalPackage}
//           disabled={
//             normalPackage.name === "" ||
//             normalPackage.version === "" ||
//             hasDependency(state.template?.value, normalPackage.name)
//           }
//         >
//           Add
//         </button>
//       </div>

//       <p className="mt-4 select-none">Add git package</p>
//       <div className="flex mt-1 gap-2">
//         <input
//           type="text"
//           placeholder=".git url"
//           value={gitPackage}
//           onChange={(e) => setGitPackage(e.target.value)}
//           className="w-full p-2 rounded-md border border-stone-600 bg-stone-800"
//           disabled={loadingGitPackage.status === "loading"}
//         />

//         {loadingGitPackage.status === "idle" && (
//           <button
//             className="rounded-md bg-stone-700 text-stone-50 px-3 py-1 select-none disabled:cursor-not-allowed disabled:opacity-50"
//             onClick={addGitPackage}
//             disabled={
//               gitPackage === "" ||
//               hasDependency(state.template?.value, gitPackage)
//             }
//           >
//             Add
//           </button>
//         )}
//         {loadingGitPackage.status === "loading" && <LoadingSpinner />}
//       </div>
//     </>
//   );
// }

// export function getAllDependencies(
//   template: Template | null | undefined,
//   getGitPathInstead?: boolean
// ): {
//   [key: string]: string;
// } {
//   if (!template) return {};

//   const useGitPath = getGitPathInstead ?? false;

//   return {
//     ...template.dependencies.internal,
//     ...Object.keys(template.dependencies.custom).reduce(
//       (acc, x) => ({
//         ...acc,
//         [x]: useGitPath
//           ? template.dependencies.custom[x].gitUrl ?? "bad_path"
//           : template.dependencies.custom[x].version,
//       }),
//       {}
//     ),
//   };
// }

// export function hasDependency(
//   template: Template | null | undefined,
//   name: string
// ) {
//   if (!template) return false;

//   if (template.dependencies.internal[name]) {
//     return true;
//   }

//   if (template.dependencies.custom[name]) {
//     return true;
//   }

//   if (Object.keys(template.dependencies.custom).length > 0) {
//     if (
//       Object.values(template.dependencies.custom).find((x) => x.gitUrl === name)
//     ) {
//       return true;
//     }
//   }

//   return false;
// }

// export function getSelectedDepdendencies(
//   template: Template | null | undefined,
//   selected: string[]
// ): { [key: string]: string } {
//   if (!template) return {};
//   const deps = getAllDependencies(template, true);
//   return Object.fromEntries(selected.map((x) => [x, deps[x]]));
// }

// export function getDependency(
//   template: Template | null | undefined,
//   key: string
// ):
//   | { type: "internal"; version: string }
//   | { type: "custom"; version: string; gitUrl?: string }
//   | undefined {
//   if (!template) return undefined;

//   if (template.dependencies.internal[key]) {
//     return {
//       type: "internal",
//       version: template.dependencies.internal[key],
//     };
//   }

//   if (template.dependencies.custom[key]) {
//     return {
//       type: "custom",
//       ...template.dependencies.custom[key],
//     };
//   }

//   return undefined;

//   // return getAllDependencies(template)[key];
// }

// export function selectAllDependencies(template: LazyValue<Template>): string[] {
//   if (!template) return [];
//   if (!template.value) return [];
//   return Object.keys(getAllDependencies(template.value));
// }
