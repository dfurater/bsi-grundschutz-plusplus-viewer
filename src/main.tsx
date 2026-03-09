import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

interface ServiceWorkerBootstrapOptions {
  navigatorObject?: Navigator;
  windowObject?: Window;
  isProd?: boolean;
}

export function mountApp() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export function bootstrapServiceWorker(options: ServiceWorkerBootstrapOptions = {}) {
  const navigatorObject = options.navigatorObject ?? navigator;
  const windowObject = options.windowObject ?? window;
  const isProd = options.isProd ?? import.meta.env.PROD;

  if (!("serviceWorker" in navigatorObject)) {
    return;
  }

  const serviceWorker = navigatorObject.serviceWorker;
  if (!serviceWorker) {
    return;
  }

  const isLocalHost = windowObject.location.hostname === "localhost" || windowObject.location.hostname === "127.0.0.1";

  if (isLocalHost) {
    windowObject.addEventListener("load", () => {
      if (typeof serviceWorker.getRegistrations !== "function") {
        return;
      }
      serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    });
    return;
  }

  if (!isProd) {
    return;
  }

  windowObject.addEventListener("load", () => {
    if (typeof serviceWorker.register !== "function") {
      return;
    }

    serviceWorker
      .register("./sw.js")
      .then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && serviceWorker.controller) {
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        let refreshed = false;
        serviceWorker.addEventListener("controllerchange", () => {
          if (refreshed) {
            return;
          }
          refreshed = true;
          windowObject.location.reload();
        });
      })
      .catch(() => {
        // Offline support is best-effort for static hosting targets.
      });
  });
}

mountApp();
bootstrapServiceWorker();
