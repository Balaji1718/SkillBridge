import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clear outdated caches (like skillbridge-cache-v1) to prevent blank pages on root URL
if ("caches" in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      if (name !== "skillbridge-cache-v2") {
        caches.delete(name).then(() => {
          console.log(`Cleared outdated cache: ${name}`);
        });
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("Service Worker registered:", reg))
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}
