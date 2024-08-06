import "./App.css";
import "react-contexify/ReactContexify.css";
import "./ContextMenu.css";
// import "reactjs-popup/dist/index.css";
import { useContext } from "react";
import MainSidebar from "./components/main-sidebar";
import ProjectsView from "./views/projects/projects-view";
import { GlobalContext } from "./context/global-context";
import EditorsView from "./views/editors/editors-view";
import NewProjectView from "./views/new-project/new-project-view";

function App() {
  const globalContext = useContext(GlobalContext.Context);

  return (
    <div className="flex flex-row w-screen h-screen overflow-hidden">
      <MainSidebar />
      <div className="flex flex-grow h-screen overflow-hidden">
        {globalContext.state.currentTab === "projects" && <ProjectsView />}
        {globalContext.state.currentTab === "editors" && <EditorsView />}
        {globalContext.state.currentTab === "new_project" && <NewProjectView />}
      </div>
    </div>
    // <FirstTimeBoot>
    //   <div className="flex flex-row w-screen h-screen overflow-hidden">
    //     <MainSidebar />
    //     <div className="flex flex-grow h-screen overflow-hidden">
    //       {state.currentTab === "projects" && <ProjectsView />}
    //       {state.currentTab === "editors" && <EditorsView />}
    //       <NewTemplateContext>
    //         {state.currentTab === "new_project" && <NewProjectView />}
    //         {state.currentTab === "new_template" && <NewTemplateView />}
    //       </NewTemplateContext>
    //       {state.currentTab === "settings" && <SettingsView />}
    //     </div>
    //   </div>
    // </FirstTimeBoot>
  );
}

export default App;
