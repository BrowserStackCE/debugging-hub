import { contextBridge, ipcRenderer } from 'electron/renderer';
import CHANNELS from './constants/ipc-channels';


const credentialsAPI: CredentialsAPI = {
    setBrowserStackAdminCredentials: (username: string, accessKey: string, _rev?: string) => ipcRenderer.invoke(CHANNELS.POST_ADMIN_CREDENTIALS, username, accessKey, _rev),
    getBrowserStackAdminCredentials: () => ipcRenderer.invoke(CHANNELS.GET_ADMIN_CREDENTIALS)
}

const browserstackAPI: BrowserStackAPI = {
    getAutomateSessionDetails: (id:string) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_SESSION, id),
    getAutomateParsedTextLogs: (session) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_PARSED_TEXT_LOGS, session),
    getSeleniumLogs: (selenium_logs_url) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_SELENIUM_LOGS, selenium_logs_url),
    getHarLogs: (har_logs_url) => ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_HAR_LOGS, har_logs_url)
}

contextBridge.exposeInMainWorld('credentialsAPI', credentialsAPI);
contextBridge.exposeInMainWorld('browserstackAPI',browserstackAPI);