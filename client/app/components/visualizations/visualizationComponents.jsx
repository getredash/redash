import HelpTrigger from "@/components/HelpTrigger";
import { Renderer, Editor } from "@/visualizations";
import { updateVisualizationsSettings } from "@/visualizations/visualizationsSettings";

updateVisualizationsSettings({ HelpTriggerComponent: HelpTrigger });

export { Renderer, Editor };
