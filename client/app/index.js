import React from "react";
import { createRoot } from "react-dom/client";

import "@/config";

import ApplicationArea from "@/components/ApplicationArea";
import offlineListener from "@/services/offline-listener";

const root = createRoot(document.getElementById("application-root"));
root.render(<ApplicationArea />);
offlineListener.init();
