import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Handle Firebase redirect result on app load
import { handleGoogleRedirect } from "./lib/firebase";

// Initialize Firebase redirect handling
handleGoogleRedirect().catch(console.error);

createRoot(document.getElementById("root")!).render(<App />);
