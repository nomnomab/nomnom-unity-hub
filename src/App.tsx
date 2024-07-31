import "./App.css";
import "react-contexify/ReactContexify.css";
import "./ContextMenu.css";
import MainSidebar from "./components/main-sidebar";
import ProjectsView from "./components/projects-view";
import InstallsView from "./components/installs-view";
import { useContext } from "react";
import { Context } from "./context/global-context";

function App() {
	const { state } = useContext(Context);

	return (
		<div className="flex flex-row w-screen h-screen overflow-hidden">
			<MainSidebar />
			<div className="flex flex-grow h-screen overflow-hidden">
				{state.currentTab === "projects" && <ProjectsView />}
				{state.currentTab === "installs" && <InstallsView />}
			</div>
		</div>
	);
}

export default App;
