// Sandboxed preload: exposes a fixed, typed API as window.vibeheal (WN-3).
// Sandboxed preloads cannot require local files, so the channel names are repeated
// here and type-checked against shared/ipc.ts.

import electron = require("electron");
import type { VibeHealBridge, IPC_CHANNELS } from "../../shared/ipc.js";

const channels = {
  backendStatus: "vibeheal:backend-status",
  listProviders: "vibeheal:list-providers",
  getProvider: "vibeheal:get-provider",
  connect: "vibeheal:connect",
  disconnect: "vibeheal:disconnect",
  runAction: "vibeheal:run-action",
  listActivity: "vibeheal:list-activity",
  openProviderLink: "vibeheal:open-provider-link",
} as const satisfies typeof IPC_CHANNELS;

const { contextBridge, ipcRenderer } = electron;

const bridge: VibeHealBridge = {
  backendStatus: () => ipcRenderer.invoke(channels.backendStatus),
  listProviders: () => ipcRenderer.invoke(channels.listProviders),
  getProvider: (providerId) => ipcRenderer.invoke(channels.getProvider, providerId),
  connect: (providerId) => ipcRenderer.invoke(channels.connect, providerId),
  disconnect: (connectionId) => ipcRenderer.invoke(channels.disconnect, connectionId),
  runAction: (connectionId, capabilityId, input) => ipcRenderer.invoke(channels.runAction, connectionId, capabilityId, input),
  listActivity: (limit) => ipcRenderer.invoke(channels.listActivity, limit),
  openProviderLink: (providerId, url) => ipcRenderer.invoke(channels.openProviderLink, providerId, url),
};

contextBridge.exposeInMainWorld("vibeheal", Object.freeze(bridge));
