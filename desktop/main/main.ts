import path from "node:path";
import { pathToFileURL } from "node:url";
import { BrowserWindow, app, ipcMain, session, shell, type IpcMainInvokeEvent } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc.js";
import { BackendClient } from "./backend-client.js";
import { createBridgeHandlers } from "./bridge-handlers.js";
import { loadDesktopConfig } from "./desktop-config.js";

// Electron main process. Hardening follows WN-3: context isolation, sandboxed renderer,
// no Node.js in the renderer, no navigation, no new windows, no permission grants.

const root = app.getAppPath();
const rendererIndex = path.join(root, "dist", "desktop", "renderer", "index.html");
const preload = path.join(root, "dist", "desktop", "preload-build", "desktop", "preload", "preload.cjs");
const rendererUrl = pathToFileURL(rendererIndex).toString();

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? "";
  return url === rendererUrl || url.startsWith(`${rendererUrl}#`) || url.startsWith(`${rendererUrl}?`);
}

function registerIpc(): void {
  const config = loadDesktopConfig(path.join(root, ".env.desktop"));
  const handlers = createBridgeHandlers({
    client: new BackendClient(config),
    openExternal: (url) => shell.openExternal(url, { activate: true }),
  });
  for (const [name, channel] of Object.entries(IPC_CHANNELS) as [keyof typeof handlers, string][]) {
    ipcMain.handle(channel, (event, ...args: unknown[]) => {
      if (!isTrustedSender(event)) {
        return { ok: false, error: { code: "forbidden", message: "Untrusted sender." } };
      }
      return handlers[name](...args);
    });
  }
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 760,
    minHeight: 520,
    title: "VibeHeal",
    backgroundColor: "#16181d",
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  });
  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  void window.loadFile(rendererIndex);
}

app.enableSandbox();

app.whenReady().then(() => {
  // Deny every permission request (camera, notifications, etc.); none is needed.
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
