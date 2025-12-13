import { parseAutomateTextLogs } from "../utils/text-logs-parser"
import CONFIG from "../constants/config"

const BASE_URL = 'https://api.browserstack.com'

const getAuth = () => {
    return `Basic ${Buffer.from(`${CONFIG.username}:${CONFIG.accessKey}`).toString('base64')}`
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

export const getSeleniumLogs = async (selenium_logs_url: string) => {
    if (!selenium_logs_url) {
        return 'No Selenium logs available for this session';
    }
    try {
        const response = await fetch(selenium_logs_url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
        // For other URLs, use the existing download function with auth
        return await download(selenium_logs_url);
    } catch (error) {
        console.error('Failed to fetch Selenium logs:', error);
        return 'Failed to load Selenium logs';
    }
}

export const getHarLogs = async (harLogsUrl: string) => {
    if (!harLogsUrl) {
        return 'No network logs available for this session';
    }
    try {
        const response = await fetch(harLogsUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Failed to fetch HAR logs:', error);
        return 'Failed to load network logs';
    }
}