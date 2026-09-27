import fs from "fs";
import path from "path";
import { VisualizationType } from "./examples";

export const TAG = "visualization-examples";
export const DATA_SOURCE_NAME = "Chinook (visualization examples)";
export const DASHBOARD_PREFIX = "Visualization Examples: ";

/** Written by the seed project, read by the tests: where to find each example. */
export interface Manifest {
  dashboards: Partial<
    Record<
      VisualizationType,
      {
        id: number;
        publicPath: string;
        widgets: Record<string, number>; // visualization name -> widget id
      }
    >
  >;
}

const MANIFEST_PATH = path.join(__dirname, ".results", "manifest.json");

export function writeManifest(manifest: Manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

export function readManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`${MANIFEST_PATH} not found - run the "seed" project first.`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}
