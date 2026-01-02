import { contextBridge, ipcRenderer } from 'electron/renderer';
import CHANNELS from './constants/ipc-channels';


const credentialsAPI: CredentialsAPI = {
    setBrowserStackAdminCredentials: (username: string, accessKey: string, _rev?: string) => ipcRenderer.invoke(CHANNELS.POST_ADMIN_CREDENTIALS, username, accessKey, _rev),
    getBrowserStackAdminCredentials: () => ipcRenderer.invoke(CHANNELS.GET_ADMIN_CREDENTIALS),
    setBrowserStackDemoCredentials: (username: string, accessKey: string, _rev?: string) => ipcRenderer.invoke(CHANNELS.POST_DEMO_CREDENTIALS, username, accessKey, _rev),
    getBrowserStackDemoCredentials: () => ipcRenderer.invoke(CHANNELS.GET_DEMO_CREDENTIALS),
}

const browserstackAPI: BrowserStackAPI = {
    getAutomateSessionDetails: (id: string) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_SESSION, id),
    getAutomateParsedTextLogs: (session) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_PARSED_TEXT_LOGS, session),
    startSession: (options) => ipcRenderer.invoke(CHANNELS.BROWSERSTACK_START_SESSION, options),
    stopSession: (options) => ipcRenderer.invoke(CHANNELS.BROWSERSTACK_STOP_SESSION, options),
    executeCommand: (options) => ipcRenderer.invoke(CHANNELS.BROWSERSTACK_EXECUTE_SESSION_COMMAND, options),
    getAutomateParsedSessionLogs: (session)=>ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_PARSED_SESSION_LOGS,session),
    getAutomateParsedSeleniumLogs: (session)=>ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_PARSED_SELENIUM_LOGS,session),
    getSeleniumLogs: (selenium_logs_url) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_SELENIUM_LOGS, selenium_logs_url),
    getHarLogs: (har_logs_url) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_HAR_LOGS, har_logs_url),
    getScannerSessionIds: (thBuildId: string) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_SCANNER_AUTOMATE_SESSION_IDS, thBuildId)
}

const electronAPI: ElectronAPI = {
    openExternalUrl: (url: string) => ipcRenderer.invoke(CHANNELS.ELECTRON_OPEN_URL, url)
}

contextBridge.exposeInMainWorld('credentialsAPI', credentialsAPI);
contextBridge.exposeInMainWorld('browserstackAPI', browserstackAPI);
contextBridge.exposeInMainWorld('electronAPI', electronAPI)