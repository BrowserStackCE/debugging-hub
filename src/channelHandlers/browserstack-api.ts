import { parseAutomateTextLogs } from "../utils/text-logs-parser"
import CONFIG from "../constants/config"
import { parseAutomateSessionLogs } from "../utils/latency-finder/session-logs-parser"
import { parseAutomateSeleniumLogs } from "../utils/latency-finder/selenium-logs-parser"
import { convertUTCToEpoch } from "../utils/latency-finder/helper"

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

export const getAutomateParsedSessionLogs = async (session: AutomateSessionResponse)=> {
    const logs = await download(session.automation_session.logs);
    const result = parseAutomateSessionLogs(logs);
    return result;
}
export const getAutomateParsedSeleniumLogs = async (session: AutomateSessionResponse)=> {
    const seleniumLogsUrl = `https://api.browserstack.com/automate/sessions/${session.automation_session.hashed_id}/seleniumlogs`
    const logs = await download(seleniumLogsUrl);

    // Convert created_at to epoch (UTC)
    const sessionCreatedAtUTC = convertUTCToEpoch(
    session.automation_session.created_at
    );
    // Extract just the date part from created_at
    const date = session.automation_session.created_at.split("T")[0]; // date = "2025-11-13"

    const result = parseAutomateSeleniumLogs(
    logs,
    date,
    sessionCreatedAtUTC
    );

    return result;
}

export const startBrowserStackSession:BrowserStackAPI['startSession'] = async (options:StartSessionOptions)=>{

}