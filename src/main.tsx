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

appWindow.show().then(() => {
  const disableMenu = () => {
    if (window.location.hostname !== "tauri.localhost") {
      return;
    }

    document.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
        return false;
      },
      { capture: true }
    );

    document.addEventListener(
      "selectstart",
      (e) => {
        e.preventDefault();
        return false;
      },
      { capture: true }
    );
  };

  disableMenu();
});
