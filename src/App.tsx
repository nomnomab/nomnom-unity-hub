import "./App.css";
import "react-contexify/ReactContexify.css";
import "./ContextMenu.css";
// import "reactjs-popup/dist/index.css";
import { useContext, useEffect, useState } from "react";
import { Context } from "./context/global-context";
import MainSidebar from "./components/main-sidebar";
import ProjectsView from "./components/projects-view";
import EditorsView from "./components/editors-view";
import NewProjectView from "./components/new-project-view";
import NewTemplateView from "./components/new-template-view";
import NewTemplateContext from "./context/new-template-context";
import { invoke } from "@tauri-apps/api";
import SettingsView from "./components/settings-view";
import FirstTimeBoot from "./components/first-time-boot";

function App() {
	const { state } = useContext(Context);
	const [refreshingCache, setRefreshingCache] = useState(false);

	useEffect(() => {
		if (refreshingCache) return;
		setRefreshingCache(true);
		invoke("refresh_template_cache").then(() => {
			setRefreshingCache(false);
		});
	}, []);

	return (
		<FirstTimeBoot>
			<div className="flex flex-row w-screen h-screen overflow-hidden">
				<MainSidebar />
				<div className="flex flex-grow h-screen overflow-hidden">
					{state.currentTab === "projects" && <ProjectsView />}
					{state.currentTab === "editors" && <EditorsView />}
					<NewTemplateContext>
						{state.currentTab === "new_project" && <NewProjectView />}
						{state.currentTab === "new_template" && <NewTemplateView />}
					</NewTemplateContext>
					{state.currentTab === "settings" && <SettingsView />}
				</div>
			</div>
		</FirstTimeBoot>
	);
}

export default App;
