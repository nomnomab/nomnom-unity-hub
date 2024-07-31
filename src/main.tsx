import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import GlobalContext from "./context/global-context";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<GlobalContext>
			<App />
		</GlobalContext>
	</React.StrictMode>
);
