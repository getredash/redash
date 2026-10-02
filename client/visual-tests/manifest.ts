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

export const PAGES_TAG = "page-examples";

/** Written by the seed-pages project, read by the page tests: the URL path of each seeded object. */
export interface PagesManifest {
  paths: Record<string, string>;
}

const RESULTS_DIR = path.join(__dirname, ".results");
const MANIFEST_PATH = path.join(RESULTS_DIR, "manifest.json");
const PAGES_MANIFEST_PATH = path.join(RESULTS_DIR, "pages-manifest.json");

/** Browser session of the admin user, saved by the seed-pages project. */
export const STORAGE_STATE_PATH = path.join(RESULTS_DIR, "storage-state.json");

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readJson(file: string, project: string) {
  if (!fs.existsSync(file)) {
    throw new Error(`${file} not found - run the "${project}" project first.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeManifest(manifest: Manifest) {
  writeJson(MANIFEST_PATH, manifest);
}

export function readManifest(): Manifest {
  return readJson(MANIFEST_PATH, "seed");
}

export function writePagesManifest(manifest: PagesManifest) {
  writeJson(PAGES_MANIFEST_PATH, manifest);
}

export function readPagesManifest(): PagesManifest {
  return readJson(PAGES_MANIFEST_PATH, "seed-pages");
}
