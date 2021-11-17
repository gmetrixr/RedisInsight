/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `../ui/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import {
  app,
  BrowserWindow,
  nativeTheme,
  shell,
  dialog,
  ipcMain,
  Tray,
} from 'electron';
import { autoUpdater, UpdateDownloadedEvent } from 'electron-updater';
import log from 'electron-log';
import installExtension, {
  REDUX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from 'electron-devtools-installer';
import Store from 'electron-store';
import detectPort from 'detect-port';
import contextMenu from 'electron-context-menu';
// eslint-disable-next-line import/no-cycle
import MenuBuilder from './menu';
import AboutPanelOptions from './about-panel';
// eslint-disable-next-line import/no-cycle
import TrayBuilder from './tray';
import server from './api/dist/src/main';
import { ElectronStorageItem, ipcEvent } from './ui/src/electron/constants';

if (process.env.NODE_ENV !== 'production') {
  log.transports.file.getFile().clear();
}

log.info('App starting.....');

export default class AppUpdater {
  constructor() {
    log.info('AppUpdater initialization');
    log.transports.file.level = 'info';

    autoUpdater.setFeedURL({
      provider: 's3',
      path: 'public/upgrades/',
      bucket: process.env.MANUAL_UPDATE_BUCKET || process.env.AWS_BUCKET_NAME,
      region: 'us-east-1',
    });

    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
  }
}

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const installExtensions = async () => {
  const extensions = [REDUX_DEVTOOLS, REACT_DEVELOPER_TOOLS];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;

  return installExtension(extensions, {
    forceDownload,
    loadExtensionOptions: { allowFileAccess: true },
  })
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err.toString()));
};

let store: Store;
let tray: TrayBuilder;
let trayInstance: Tray;
let isQuiting = false;

export const getDisplayAppInTrayValue = (): boolean => {
  if (process.platform === 'linux') {
    return false;
  }
  return !!store?.get(ElectronStorageItem.isDisplayAppInTray);
};

/**
 * Backend part...
 */
const port = 5000;
const launchApiServer = async () => {
  try {
    const detectPortConst = await detectPort(port);
    process.env.API_PORT = detectPortConst?.toString();
    log.info('Available port:', detectPortConst);
    server();
  } catch (error) {
    log.error('Catch server error:', error);
  }
};

const bootstrap = async () => {
  await launchApiServer();
  nativeTheme.themeSource = 'dark';

  store = new Store();

  if (getDisplayAppInTrayValue()) {
    tray = new TrayBuilder();
    trayInstance = tray.buildTray();
  }

  if (process.env.NODE_ENV === 'production') {
    new AppUpdater();
  }

  app.setName('RedisInsight');
  app.setAppUserModelId('RedisInsight-preview');
  if (process.platform !== 'darwin') {
    app.setAboutPanelOptions(AboutPanelOptions);
  }

  if (process.env.NODE_ENV !== 'production') {
    await installExtensions();
  }
};

export const windows = new Set<BrowserWindow>();

export const createWindow = async () => {
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../resources');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  let x;
  let y;
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (currentWindow) {
    const [currentWindowX, currentWindowY] = currentWindow.getPosition();
    x = currentWindowX + 24;
    y = currentWindowY + 24;
  }
  let newWindow: BrowserWindow | null = new BrowserWindow({
    x,
    y,
    show: false,
    width: 1300,
    height: 860,
    minHeight: 540,
    minWidth: 720,
    // frame: process.platform === 'darwin',
    // titleBarStyle: 'hidden',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      webSecurity: false,
      contextIsolation: false,
      spellcheck: true,
      allowRunningInsecureContent: true,
      enableRemoteModule: true,
      scrollBounce: true,
    },
  });

  newWindow.loadURL(`file://${__dirname}/index.html`);

  newWindow.webContents.on('did-finish-load', () => {
    if (!newWindow) {
      throw new Error('"newWindow" is not defined');
    }

    if (!trayInstance?.isDestroyed()) {
      tray?.updateTooltip(newWindow.webContents.getTitle());
    }

    if (process.env.START_MINIMIZED) {
      newWindow.minimize();
    } else {
      newWindow.show();
      newWindow.focus();
    }
  });

  newWindow.on('page-title-updated', () => {
    if (newWindow && !trayInstance?.isDestroyed()) {
      tray?.updateTooltip(newWindow.webContents.getTitle());
      tray?.buildContextMenu();
    }
  });

  newWindow.on('close', (event) => {
    if (!isQuiting && getDisplayAppInTrayValue() && windows.size === 1) {
      event.preventDefault();
      newWindow?.hide();
      app.dock?.hide();
    }
  });

  newWindow.on('closed', () => {
    if (newWindow) {
      windows.delete(newWindow);
      newWindow = null;
    }

    if (!trayInstance?.isDestroyed()) {
      tray?.buildContextMenu();
    }
  });

  newWindow.on('focus', () => {
    if (newWindow) {
      const menuBuilder = new MenuBuilder(newWindow);
      menuBuilder.buildMenu();

      if (!trayInstance?.isDestroyed()) {
        tray?.updateTooltip(newWindow.webContents.getTitle());
      }
    }
  });

  // Open urls in the user's browser
  newWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // event newWindow.webContents.on('context-menu', ...)
  contextMenu({ window: newWindow, showInspectElement: true });

  windows.add(newWindow);
  if (!trayInstance?.isDestroyed()) {
    tray?.buildContextMenu();
    tray?.updateTooltip(newWindow.webContents.getTitle());
  }

  return newWindow;
};

export const getWindows = () => windows;

export const updateDisplayAppInTray = (value: boolean) => {
  store?.set(ElectronStorageItem.isDisplayAppInTray, value);
  if (!value) {
    trayInstance?.destroy();
    return;
  }
  tray = new TrayBuilder();
  trayInstance = tray.buildTray();

  const currentWindow = BrowserWindow.getFocusedWindow();
  if (currentWindow) {
    tray.updateTooltip(currentWindow.webContents.getTitle());
  }
};

export const setToQuiting = () => {
  isQuiting = true;
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  log.info('window-all-closed');
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('continue-activity-error', (event, type, error) => {
  log.info('event', event);
  log.info('type', type);
  log.info('error', error);
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.whenReady().then(bootstrap).then(createWindow).catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (windows.size === 0) createWindow();
});

function sendStatusToWindow(text: string) {
  log.info(text);
  // newWindow?.webContents.send('message', text);
}

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for update...');
});
autoUpdater.on('update-available', () => {
  sendStatusToWindow('Update available.');
  store?.set(ElectronStorageItem.isUpdateAvailable, true);
});
autoUpdater.on('update-not-available', () => {
  sendStatusToWindow('Update not available.');
  store?.set(ElectronStorageItem.isUpdateAvailable, false);
});
autoUpdater.on('error', (err: string) => {
  sendStatusToWindow(`Error in auto-updater. ${err}`);
});
autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
  logMessage += ` - Downloaded ${progressObj.percent}%`;
  logMessage += ` (${progressObj.transferred}/${progressObj.total})`;
  sendStatusToWindow(logMessage);
});
autoUpdater.on('update-downloaded', (info: UpdateDownloadedEvent) => {
  sendStatusToWindow('Update downloaded');
  log.info('releaseNotes', info.releaseNotes);
  log.info('releaseDate', info.releaseDate);
  log.info('releaseName', info.releaseName);
  log.info('version', info.version);
  log.info('files', info.files);

  // set updateDownloaded to electron storage for Telemetry send event APPLICATION_UPDATED
  store?.set(ElectronStorageItem.updateDownloaded, true);
  store?.set(ElectronStorageItem.updateDownloadedForTelemetry, true);
  store?.set(ElectronStorageItem.updateDownloadedVersion, info.version);
  store?.set(ElectronStorageItem.updatePreviousVersion, app.getVersion());

  log.info('Path to downloaded file: ', info.downloadedFile);
});

app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // Skip error due to self-signed certificate
  event.preventDefault();
  callback(true);
});

// ipc events
ipcMain.handle(ipcEvent.getStoreValue, (_event, key) => store?.get(key));

ipcMain.handle(ipcEvent.deleteStoreValue, (_event, key) => store?.delete(key));

dialog.showErrorBox = (title: string, content: string) => {
  log.error('Dialog shows error:', `\n${title}\n${content}`);
};