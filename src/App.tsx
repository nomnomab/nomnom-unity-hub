import "./App.css";
import "react-contexify/ReactContexify.css";
import "./ContextMenu.css";
// import "react-toastify/dist/ReactToastify.css";
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
import toast, { Toaster } from "react-hot-toast";
import { routeErrorToToast } from "./utils/toast-utils";
import { fetch } from "@tauri-apps/api/http";

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
      checkVersion();
    }
  }, []);

  async function checkVersion() {
    if (window.sessionStorage.getItem("checked_version")) return;
    window.sessionStorage.setItem("checked_version", "true");

    const url =
      "https://raw.githubusercontent.com/nomnomab/nomnom-unity-hub/master/package.json";
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = response.data as {
        version: string;
      };

      if (!data || !data.version || data.version === "") {
        routeErrorToToast(new Error("No version found"));
        return;
      }

      if (data.version !== window.localStorage.getItem("app_version")) {
        toast(
          (t) => (
            <div className="text-stone-50 rounded-md flex gap-4 items-center select-none">
              <p className="text-sm font-medium">
                Version {data.version} is available!
              </p>
              <p className="text-sm font-medium">
                <a
                  href="https://github.com/nomnomab/nomnom-unity-hub/releases"
                  title="https://github.com/nomnomab/nomnom-unity-hub/releases"
                  target="_blank"
                  className="text-stone-300 hover:text-sky-400 underline underline-offset-4 decoration-stone-600"
                  onClick={() => toast.dismiss(t.id)}
                >
                  Open
                </a>
              </p>
              <button
                className="text-sm font-medium text-stone-300 hover:text-sky-400 underline underline-offset-4 decoration-stone-600"
                onClick={() => toast.dismiss(t.id)}
              >
                Dismiss
              </button>
            </div>
          ),
          {
            duration: Infinity,
            position: "bottom-center",
          }
        );
      }
    } catch (e) {
      routeErrorToToast(e);
    }
  }

  if (isLoading.value) {
    return null;
  }

  if (isFirstBoot.value) {
    return <FirstBoot />;
  }

  return (
    <div className="flex flex-row w-screen h-screen overflow-hidden">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#292524",
            color: "#fff",
            border: "1px solid #57534e",
          },
        }}
      />
      <MainSidebar />
      <div className="flex flex-grow h-screen overflow-hidden">
        {globalContext.state.currentTab === "projects" && <ProjectsView />}
        {globalContext.state.currentTab === "editors" && <EditorsView />}
        {(globalContext.state.currentTab === "new_project" ||
          globalContext.state.currentTab === "new_template") && (
          <NewProjectView />
        )}
        {globalContext.state.currentTab === "settings" && <SettingsView />}
      </div>
    </div>
  );
}

export default App;
