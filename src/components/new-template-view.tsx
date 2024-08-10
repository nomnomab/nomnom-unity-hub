// import { useContext, useEffect, useState } from "react";
// import * as NewTemplateContext from "../context/new-template-context";
// import * as GlobalContext from "../context/global-context";
// import {
//   ValidateInput,
//   ValidateInputContext,
//   ValidateTextArea,
// } from "./validate-input";
// import PackagePicker, {
//   getDependency,
//   getSelectedDepdendencies,
//   PackagePickerState,
// } from "./package-picker";
// import { MinimalTemplate } from "../context/global-context";
// import { invoke } from "@tauri-apps/api/tauri";
// import { LazyValue } from "../utils";
// import { open } from "@tauri-apps/api/dialog";
// import Popup from "reactjs-popup";
// import LoadingSpinner from "./svg/loading-spinner";

// type PackageJson = {
//   dependencies: Record<string, string>;
//   description: string;
//   displayName: string;
//   host: string;
//   name: string;
//   type: string;
//   unity: string;
//   version: string;
//   isCustom: boolean;
// };

// export default function NewTemplateView() {
//   const { state } = useContext(NewTemplateContext.Context);
//   const { state: globalState, dispatch } = useContext(GlobalContext.Context);

//   const [newTemplate, setNewTemplate] = useState<
//     LazyValue<GlobalContext.Template>
//   >({
//     status: "idle",
//     value: {
//       name: "com.custom.template",
//       displayName: "Custom Template",
//       version: "1.0.0",
//       description: "",
//       dependencies: {
//         internal: {},
//         custom: {},
//       },
//     },
//   });
//   const [json, setJson] = useState<PackageJson>({
//     name: "com.custom.template",
//     displayName: "Custom Template",
//     host: "hub",
//     type: "template",
//     unity: state.editor?.version ?? "unknown",
//     version: "1.0.0",
//     dependencies: {},
//     description: "",
//     isCustom: true,
//   });
//   const [readableTemplates, setReadableTemplates] = useState<MinimalTemplate[]>(
//     []
//   );

//   const [packagePickerState, setPackagePickerState] =
//     useState<PackagePickerState>({
//       template: newTemplate,
//       selectedPackages: [] as string[],
//     } as PackagePickerState);

//   const [canSubmit, setCanSubmit] = useState(true);
//   const [selectedProjectPath, setSelectedProjectPath] = useState<
//     string | undefined
//   >();
//   const [showCreateProjectPopup, setShowCreateProjectPopup] = useState(false);

//   function submit(submitEvent: React.FormEvent<HTMLFormElement>) {
//     submitEvent.preventDefault();
//   }

//   function cancel() {
//     dispatch({ type: "change_tab", tab: "new_project" });
//   }

//   useEffect(() => {
//     loadTemplates(state.editor.version);
//   }, []);

//   useEffect(() => {
//     setPackagePickerState((s) => ({
//       ...s,
//       template: newTemplate,
//     }));
//   }, [newTemplate, newTemplate.status]);

//   async function loadTemplates(version: string) {
//     if (!version) {
//       return;
//     }

//     const templates: MinimalTemplate[] = await invoke("get_quick_templates", {
//       editorVersion: version,
//     });

//     setReadableTemplates(templates);
//   }

//   function isSelected(template: MinimalTemplate) {
//     return packagePickerState.selectedPackages.includes(template.id);
//   }

//   async function selectTemplate(template: MinimalTemplate) {
//     // take the deps from it and override the current packages
//     const rawTemplate = await invoke("load_template", {
//       templateHeader: template,
//     });

//     // @ts-ignore
//     const t = GlobalContext.convertRustTemplateToTS(rawTemplate);

//     setNewTemplate((s) => ({
//       status: "success",
//       value: t,
//     }));

//     setPackagePickerState((s) => ({
//       ...s,
//       selectedPackages: [],
//     }));
//   }

//   async function openProjectPicker() {
//     const project = await open({
//       directory: true,
//       multiple: false,
//     });

//     if (!project) return;

//     // make sure this is a project root
//     const projectPath = project as string;
//     const isValidPath = await invoke("is_valid_project_root_dir", {
//       path: projectPath,
//     });

//     if (!isValidPath) {
//       console.error("Invalid project path");
//       return;
//     }

//     setSelectedProjectPath(project as string);
//   }

//   async function createTemplate() {
//     const selectedPackages = packagePickerState.selectedPackages;
//     const packages = getSelectedDepdendencies(
//       packagePickerState.template.value,
//       selectedPackages
//     );
//     const finalJson = {
//       ...json,
//       name: `${json.name}.${state.editor.version.replace(/\./g, "-")}`,
//       dependencies: packages,
//     };

//     setShowCreateProjectPopup(true);

//     await invoke("generate_template", {
//       package: {
//         json: finalJson,
//         projectPath:
//           !selectedProjectPath || selectedProjectPath === ""
//             ? undefined
//             : selectedProjectPath,
//       },
//     });

//     setShowCreateProjectPopup(false);

//     dispatch({ type: "change_tab", tab: "new_project" });
//   }

//   return (
//     <div className="flex flex-col w-full">
//       <Header />
//       <div className="flex justify-center w-full h-full overflow-y-auto">
//         <div className="flex flex-col flex-grow w-full max-w-6xl">
//           {/* quick import */}
//           <div className="flex justify-center w-full">
//             {!selectedProjectPath && (
//               <div
//                 className="border border-stone-700 w-96 h-40 rounded-sm m-6 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-800 border-dashed"
//                 onClick={openProjectPicker}
//               >
//                 <p className="max-w-72 text-stone-400 text-center select-none">
//                   {/* Drag and drop a project or browse to select one */}
//                   Browse to select a project that will be used for the default
//                   assets
//                 </p>
//                 <button className="mt-4 rounded-md text-stone-50 bg-stone-700 px-3 py-1 ml-3 select-none">
//                   Browse
//                 </button>
//               </div>
//             )}

//             {selectedProjectPath && (
//               <div className="border border-stone-700 h-40 rounded-sm m-6 flex flex-col items-center justify-center hover:bg-stone-800 flex-grow">
//                 <p className="max-w-52 text-stone-50 text-center select-none">
//                   Uploaded project:
//                 </p>
//                 <p className="text-stone-400 text-center select-none">
//                   {selectedProjectPath}
//                 </p>
//               </div>
//             )}
//           </div>

//           <p className="text-sm text-stone-400 text-center -mt-2 mb-4 select-none">
//             If none is uploaded, an empty project will be used instead
//           </p>

//           <div className="flex flex-row flex-grow">
//             <div className="p-6 flex flex-col w-6/12 border-r border-r-stone-700 overflow-y-auto">
//               <p className="text-lg text-stone-50 select-none">
//                 Import from Other Template
//               </p>
//               <div className="pt-2 pb-6 flex flex-col gap-2">
//                 {readableTemplates.map((x) => (
//                   <div key={x.id} className="flex flex-col">
//                     <div
//                       className={`rounded-md flex px-6 py-3 border text-sm cursor-pointer transition-colors select-none ${
//                         isSelected(x)
//                           ? "border-sky-600 text-stone-50 hover:bg-sky-800"
//                           : "hover:bg-sky-600 hover:text-stone-50 border-stone-600"
//                       }`}
//                       onClick={() => selectTemplate(x)}
//                     >
//                       <p>{x.displayName}</p>
//                       <p className="ml-auto">{x.version}</p>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               <PackagePicker
//                 state={packagePickerState}
//                 setState={setPackagePickerState}
//               />
//             </div>
//             <div className="p-6 flex flex-col w-6/12 overflow-hidden">
//               <p className="text-lg text-stone-50 select-none">
//                 Template Information
//               </p>

//               {/* json editor */}
//               <ValidateInputContext
//                 onErrorChanged={(hasError) => setCanSubmit(!hasError)}
//               >
//                 <form onSubmit={submit} className="flex flex-col flex-grow">
//                   <div className="flex flex-col gap-2">
//                     <ValidateInput
//                       type="text"
//                       name="name"
//                       label="Name"
//                       className="p-2 rounded-md border border-stone-600 bg-stone-800"
//                       value={json.name}
//                       onChange={(e) =>
//                         setJson({ ...json, name: e.target.value })
//                       }
//                       errorMessage={() => "Invalid name"}
//                       hasError={() => {
//                         let isError = false;
//                         if (!json.name || json.name === "") {
//                           isError = true;
//                         }

//                         if (json.name && json.name.includes(" ")) {
//                           isError = true;
//                         }

//                         if (json.name && json.name.split(".").length < 3) {
//                           isError = true;
//                         }

//                         return isError;
//                       }}
//                     />

//                     <ValidateInput
//                       type="text"
//                       name="display-name"
//                       label="Display Name"
//                       className="p-2 rounded-md border border-stone-600 bg-stone-800"
//                       value={json.displayName}
//                       onChange={(e) =>
//                         setJson({ ...json, displayName: e.target.value })
//                       }
//                       errorMessage={() => "Invalid display name"}
//                       hasError={() =>
//                         !json.displayName || json.displayName === ""
//                       }
//                     />

//                     <ValidateTextArea
//                       name="description"
//                       label="Description"
//                       className="p-2 rounded-md border border-stone-600 bg-stone-800 min-h-24 max-h-72"
//                       value={json.description}
//                       onChange={(e) =>
//                         setJson({ ...json, description: e.target.value })
//                       }
//                       errorMessage={() => "Invalid description"}
//                       hasError={() =>
//                         !json.description || json.description === ""
//                       }
//                     />

//                     <ValidateInput
//                       type="text"
//                       name="version"
//                       label="Version"
//                       className="p-2 rounded-md border border-stone-600 bg-stone-800"
//                       value={json.version}
//                       onChange={(e) =>
//                         setJson({ ...json, version: e.target.value })
//                       }
//                       errorMessage={() => "Invalid version"}
//                       hasError={() =>
//                         !json.version ||
//                         json.version === "" ||
//                         json.version.includes(" ") ||
//                         (json.version && json.version.split(".").length > 3) ||
//                         false
//                       }
//                     />
//                   </div>

//                   <div className="flex justify-end mt-auto pt-1">
//                     <button
//                       className="mt-4 rounded-md text-stone-50 bg-stone-700 px-3 py-1 select-none"
//                       onClick={cancel}
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       className="mt-4 rounded-md text-stone-50 bg-sky-700 px-3 py-1 ml-3 select-none disabled:opacity-50 disabled:cursor-not-allowed"
//                       disabled={!canSubmit}
//                       onClick={createTemplate}
//                     >
//                       Create
//                     </button>
//                   </div>
//                 </form>
//               </ValidateInputContext>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* <Popup position="center center" modal open={showEmptyProjectPopup}>
// 				<div className="bg-[#0c0a09b4] fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center">
// 					<div className="px-8 py-6 flex flex-col items-center justify-center bg-stone-900 border border-stone-600 rounded-md gap-4 select-none">
// 						<p className="max-w-[32rem] text-center">
// 							No project was selected, so an empty one will be generated. When
// 							this happens, Unity will open the project in the editor.
// 						</p>
// 						<p className="text-center">
// 							Once it loads in the editor, simply exit it to continue.
// 						</p>
// 						<button
// 							className="rounded-md text-stone-50 bg-sky-700 px-3 py-1"
// 							onClick={() => setShowEmptyProjectPopup(false)}
// 						>
// 							Okay
// 						</button>
// 					</div>
// 				</div>
// 			</Popup> */}

//       <Popup position="center center" modal open={showCreateProjectPopup}>
//         <div className="bg-[#0c0a09b4] fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center">
//           <div className="px-8 py-6 flex flex-col items-center justify-center bg-stone-900 border border-stone-600 rounded-md gap-4 select-none">
//             <p className="text-center">Creating template...</p>
//             <LoadingSpinner />
//           </div>
//         </div>
//       </Popup>
//     </div>
//   );
// }

// function Header() {
//   const { state } = useContext(NewTemplateContext.Context);
//   return (
//     <div className="flex flex-row border-b border-b-stone-700 justify-center">
//       <div className="flex flex-row w-full max-w-6xl px-8 py-8 items-end select-none">
//         <h1 className="text-stone-50">New Template</h1>
//         <p className="ml-auto text-stone-200">{state.editor.version}</p>
//       </div>
//     </div>
//   );
// }
