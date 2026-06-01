import { initSentry } from "@/lib/sentry";
initSentry();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register PWA service worker
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  }).catch(err => {
    console.error('PWA Registration failed:', err);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
