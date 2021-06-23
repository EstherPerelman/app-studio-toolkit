import { ItemWatcherApi, ProjectApi, WorkspaceApi } from "@sap/project-api";
import { debounce, forEach } from "lodash";
import { initTagsContexts } from "./context-state";
import { getWorkspaceAPI } from "./workspace-instance";


const projectWatchers: Map<ProjectApi, ItemWatcherApi> = new Map();

const rebuildVSCodeCustomContext = debounce(() => {
  void initTagsContexts(getWorkspaceAPI());
}, 1000);

export async function initProjectTypeWatchers(
  workspaceImpl: WorkspaceApi
): Promise<void> {
  await registerAllProjectsListeners(workspaceImpl);
  workspaceImpl.onWorkspaceChanged(() => {
    removeAllProjectListeners();
  });
}

async function registerAllProjectsListeners(workspaceImpl: WorkspaceApi) {
  const projects = await workspaceImpl.getProjects();
  forEach(projects, onProjectAdded);
}

function removeAllProjectListeners() {
  projectWatchers.forEach(onProjectRemoved);
}

async function onProjectAdded(projectApi: ProjectApi): Promise<void> {
  const currItemWatcher = await projectApi.watchItems();
  // we are re-building **all** our VSCode custom contexts on every change.
  // to avoid maintaining the complex logic of more granular modifications to
  currItemWatcher.addListener("add", rebuildVSCodeCustomContext);
  currItemWatcher.addListener("update", rebuildVSCodeCustomContext);
  currItemWatcher.addListener("delete", rebuildVSCodeCustomContext);
  projectWatchers.set(projectApi, currItemWatcher);
}

function onProjectRemoved(itemWatcher: ItemWatcherApi ,projectApi: ProjectApi): void {
  void itemWatcher.destroy();
  projectWatchers.delete(projectApi);
}