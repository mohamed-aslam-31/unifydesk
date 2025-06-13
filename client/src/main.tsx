import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Firebase initialization disabled for now - can be enabled when API keys are provided

createRoot(document.getElementById("root")!).render(<App />);
