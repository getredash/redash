import "ace-builds/src-noconflict/theme-textmate";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import { useTheme } from "@/services/theme";

// The Ace editor theme that matches the app's colour theme
export default function useAceTheme() {
  return useTheme() === "dark" ? "tomorrow_night" : "textmate";
}
