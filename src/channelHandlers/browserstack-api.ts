import { parseAutomateTextLogs } from "../utils/text-logs-parser"
import CONFIG from "../constants/config"

const BASE_URL = 'https://api.browserstack.com'

const getAuth = (username?:string,accessKey?:string) => {
    return `Basic ${Buffer.from(`${username || CONFIG.adminUsername}:${accessKey || CONFIG.adminAccessKey}`).toString('base64')}`
}

const download = async (url: string) => {
    return fetch(url, {
        headers: {
            "Authorization": getAuth()
        }
    }).then(async (res) => {
        if (res.ok) {
            return res.text()
        } else {
            throw await res.text()
        }
    });
}

export const getAutomateSessionDetails: BrowserStackAPI['getAutomateSessionDetails'] = async (id: string) => {
    const sessionDetailsTextData = await download(`${BASE_URL}/automate/sessions/${id}`);
    const sessionDetailsJSON = JSON.parse(sessionDetailsTextData) as AutomateSessionResponse
    return sessionDetailsJSON
}

export const getParsedAutomateTextLogs = async (session:AutomateSessionResponse) => {
    const logs = await download(session.automation_session.logs);
    const result = parseAutomateTextLogs(logs.split('\n'))
    return result
}

export const startBrowserStackSession:BrowserStackAPI['startSession'] = async (options:StartSessionOptions)=>{

}