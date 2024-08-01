import "./App.css";
import "react-contexify/ReactContexify.css";
import "./ContextMenu.css";
import { useContext } from "react";
import { Context } from "./context/global-context";
import MainSidebar from "./components/main-sidebar";
import ProjectsView from "./components/projects-view";
import EditorsView from "./components/editors-view";
import NewProjectView from "./components/new-project-view";

function App() {
	const { state } = useContext(Context);

	return (
		<div className="flex flex-row w-screen h-screen overflow-hidden">
			<MainSidebar />
			<div className="flex flex-grow h-screen overflow-hidden">
				{state.currentTab === "projects" && <ProjectsView />}
				{state.currentTab === "editors" && <EditorsView />}
				{state.currentTab === "new_project" && <NewProjectView />}
			</div>
		</div>
	);
}

export default App;
