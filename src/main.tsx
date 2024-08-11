import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GlobalContext } from "./context/global-context";
import { appWindow } from "@tauri-apps/api/window";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalContext.User>
      <App />
    </GlobalContext.User>
  </React.StrictMode>
);

appWindow.show().then(() => {});
