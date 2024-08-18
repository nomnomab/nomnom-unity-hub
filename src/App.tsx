import "./App.css";
import "react-contexify/ReactContexify.css";
import "./ContextMenu.css";
// import "reactjs-popup/dist/index.css";

// import "reactjs-popup/dist/index.css";
import { useContext, useEffect } from "react";
import MainSidebar from "./components/main-sidebar";
import ProjectsView from "./views/projects/projects-view";
import { GlobalContext } from "./context/global-context";
import EditorsView from "./views/editors/editors-view";
import NewProjectView from "./views/new-project/new-project-view";
import SettingsView from "./views/settings/settings-view";
import useBetterState from "./hooks/useBetterState";
import FirstBoot from "./views/first-boot/first-boot";
import { getVersion } from "@tauri-apps/api/app";
import { TauriRouter } from "./utils/tauri-router";

function App() {
  const globalContext = useContext(GlobalContext.Context);
  const isLoading = useBetterState(true);
  const isFirstBoot = useBetterState(false);

  useEffect(() => {
    let version = window.localStorage.getItem("app_version");
    const check = async () => {
      const appVersion = await getVersion();
      if (!version || appVersion !== version) {
        TauriRouter.delete_template_cache();
        window.localStorage.setItem("app_version", appVersion);
      }
    };
    check();
  }, []);

  useEffect(() => {
    // window.localStorage.removeItem("past_first_boot");
    const firstBoot = !window.localStorage.getItem("past_first_boot");

    const load = async () => {
      isFirstBoot.set(true);

      await new Promise((resolve) => setTimeout(resolve, 150));
      isLoading.set(false);
    };

    if (firstBoot) {
      load();
    } else {
      isFirstBoot.set(false);
      isLoading.set(false);
    }
  }, []);

  if (isLoading.value) {
    return null;
  }

  if (isFirstBoot.value) {
    return <FirstBoot />;
  }

  return (
    <div className="flex flex-row w-screen h-screen overflow-hidden">
      <MainSidebar />
      <div className="flex flex-grow h-screen overflow-hidden">
        {globalContext.state.currentTab === "projects" && <ProjectsView />}
        {globalContext.state.currentTab === "editors" && <EditorsView />}
        {globalContext.state.currentTab === "new_project" && <NewProjectView />}
        {globalContext.state.currentTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
}

export default App;
