import { createRoot } from "react-dom/client";
import FactoryExperience from "../app/factory-experience";
import "../app/globals.css";

const mount = document.getElementById("riskmulate-root");

if (!mount) throw new Error("RiskMulate mount point is missing.");

createRoot(mount).render(<FactoryExperience />);
