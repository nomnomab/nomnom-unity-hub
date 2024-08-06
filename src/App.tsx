import "./App.css";
import "react-contexify/ReactContexify.css";
import "./ContextMenu.css";
// import "reactjs-popup/dist/index.css";
import { useContext } from "react";
import MainSidebar from "./components/main-sidebar";
import ProjectsView from "./views/projects/projects-view";
import { GlobalContext } from "./context/global-context";
import EditorsView from "./views/editors/editors-view";

function App() {
  const globalContext = useContext(GlobalContext.Context);
  // const [refreshingCache, setRefreshingCache] = useState(false);

  // useEffect(() => {
  //   // test
  //   invoke("get_prefs")
  //     .then((prefs: any) => {
  //       console.log(prefs);
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //     });

  //   if (refreshingCache) return;
  //   setRefreshingCache(true);
  //   invoke("refresh_template_cache").then(() => {
  //     setRefreshingCache(false);
  //   });
  // }, []);

  return (
    <div className="flex flex-row w-screen h-screen overflow-hidden">
      <MainSidebar />
      <div className="flex flex-grow h-screen overflow-hidden">
        {globalContext.state.currentTab === "projects" && <ProjectsView />}
        {globalContext.state.currentTab === "editors" && <EditorsView />}
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
