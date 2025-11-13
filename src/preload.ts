import { contextBridge, ipcRenderer } from 'electron/renderer';
import CHANNELS from './constants/ipc-channels';


const credentialsAPI: CredentialsAPI = {
    setBrowserStackAdminCredentials: (username: string, accessKey: string, _rev?: string) => ipcRenderer.invoke(CHANNELS.POST_ADMIN_CREDENTIALS, username, accessKey, _rev),
    getBrowserStackAdminCredentials: () => ipcRenderer.invoke(CHANNELS.GET_ADMIN_CREDENTIALS),
    setBrowserStackDemoCredentials: (username: string, accessKey: string, _rev?: string) => ipcRenderer.invoke(CHANNELS.POST_DEMO_CREDENTIALS, username, accessKey, _rev),
    getBrowserStackDemoCredentials: ()=>ipcRenderer.invoke(CHANNELS.GET_DEMO_CREDENTIALS),
}

const browserstackAPI: BrowserStackAPI = {
    getAutomateSessionDetails: (id:string)=> ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_SESSION,id),
    getAutomateParsedTextLogs: (session)=>ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_PARSED_TEXT_LOGS,session),
    startSession:(options)=>ipcRenderer.invoke(CHANNELS.BROWSERSTACK_START_SESSION,options),

    // latency-finder
    getAutomateParsedSessionLogs: (session)=>ipcRenderer.invoke(CHANNELS.GET_BROWSERSTACK_AUTOMATE_PARSED_SESSION_LOGS,session),
}

contextBridge.exposeInMainWorld('credentialsAPI', credentialsAPI);
contextBridge.exposeInMainWorld('browserstackAPI',browserstackAPI);