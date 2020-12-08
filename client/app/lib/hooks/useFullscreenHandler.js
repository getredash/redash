import { has } from "lodash";
import { useEffect, useState } from "react";
import location from "@/services/location";

export default function useFullscreenHandler() {
  const [fullscreen, setFullscreen] = useState(has(location.search, "fullscreen"));
  useEffect(() => {
    document.body.classList.toggle("headless", fullscreen);
    location.setSearch({ fullscreen: fullscreen ? true : null }, true);
  }, [fullscreen]);

  const toggleFullscreen = () => setFullscreen(!fullscreen);
  return [fullscreen, toggleFullscreen];
}
