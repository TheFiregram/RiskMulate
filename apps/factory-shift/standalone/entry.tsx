import { createRoot } from "react-dom/client";
import ExperienceUpgrades from "../app/experience-upgrades";
import "../app/globals.css";
import "../app/apex-shell.css";

const mount = document.getElementById("riskmulate-root");

if (!mount) throw new Error("RiskMulate mount point is missing.");

createRoot(mount).render(<ExperienceUpgrades />);
