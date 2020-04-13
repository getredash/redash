import HelpTrigger from "@/components/HelpTrigger";
import { Renderer, Editor } from "@/visualizations/components";
import { updateVisualizationsSettings } from "@/visualizations/components/visualizationsSettings";

updateVisualizationsSettings({ HelpTriggerComponent: HelpTrigger });

export { Renderer, Editor };
