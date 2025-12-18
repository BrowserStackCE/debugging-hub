import { parseAutomateTextLogs } from "../utils/text-logs-parser"
import CONFIG from "../constants/config"
import { parseAutomateSessionLogs } from "../utils/latency-finder/session-logs-parser"
import { parseAutomateSeleniumLogs } from "../utils/latency-finder/selenium-logs-parser"
import { convertUTCToEpoch } from "../utils/latency-finder/helper"

const BASE_URL = 'https://api.browserstack.com'

const getAuth = (username?: string, accessKey?: string) => {
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

export const getParsedAutomateTextLogs = async (session: AutomateSessionResponse) => {
    const logs = await download(session.automation_session.logs);
    const lines = logs.split('\n');

    const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{1,2}:\d{1,2}:\d{1,3}/;

    const entries: string[] = [];

    for (const line of lines) {
        if (timestampRegex.test(line)) {
            // New log entry → push as a new entry
            entries.push(line);
        } else if (entries.length > 0) {
            // Continuation of previous entry → append
            entries[entries.length - 1] += '\n' + line;
        } else {
            // Edge case: first line doesn't start with timestamp
            entries.push(line);
        }
    }

    console.log(entries)

    return parseAutomateTextLogs(entries);
};

const sendRequest = async (method: string, url: string, body: any = {}, auth: string) => {
    delete body.fetchRawLogs;

    // BrowserStack WebDriver quirk: convert "text" → "value" array for sendKeys
    //   if (util.getCommandName?.(url) === 'sendKeys' && !body['value'] && body['text']) {
    //     body['value'] = body['text'].split('');
    //   }

    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json; charset=utf-8',
        'Authorization': auth,
    };

    const fetchOptions: RequestInit = {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(url, fetchOptions);
    const isJSON = response.headers.get('content-type')?.includes('application/json');
    const data = isJSON ? await response.json() : await response.text();

    if (!response.ok) {
        throw new Error(
            `BrowserStack API Error: ${response.status} ${response.statusText} — ${JSON.stringify(data)}`
        );
    }

    return data;
};

export const startBrowserStackSession: BrowserStackAPI['startSession'] = async (
    options: StartSessionOptions
) => {
    const auth = getAuth(CONFIG.demoUsername, CONFIG.demoAccessKey);
    const hubUrl =
        options.hubUrl ||
        CONFIG.hubUrl;

    const capabilities = options.capabilities;

    // WebDriver requires the payload to be under "capabilities" → "alwaysMatch"
    const body = {
        capabilities: {
            alwaysMatch: capabilities,
        },
    };
    console.log(body)
    const data = await sendRequest('POST', hubUrl + '/session', body, auth);

    const sessionId =
        data?.value?.sessionId || data?.sessionId || data?.value?.session_id;

    return {
        sessionId,
        raw: data,
    };
};

export const stopBrowserStackSession: BrowserStackAPI['stopSession'] = async (
    options: StopSessionOptions
) => {
    // Get auth credentials (can be per-user or from config defaults)
    const auth = getAuth(CONFIG.demoUsername, CONFIG.demoAccessKey);

    // Determine hub URL (defaults to BrowserStack Selenium Hub)
    const hubUrl =
        options.hubUrl ||
        CONFIG.hubUrl ||
        'https://hub-cloud.browserstack.com/wd/hub';

    // Construct session endpoint
    const sessionUrl = `${hubUrl}/session/${options.sessionId}`;

    // Perform DELETE request to end the session
    const response = await sendRequest('DELETE', sessionUrl, {}, auth);

    return {
        success: true,
        sessionId: options.sessionId,
        raw: response,
    };
};

export const executeCommand: BrowserStackAPI['executeCommand'] = async (
    options: ExecuteCommandOptions
) => {
    const { request, sessionId } = options;

    const hubUrl =
        options.hubUrl ||
        CONFIG.hubUrl ||
        'https://hub-cloud.browserstack.com/wd/hub';

    const auth = getAuth(CONFIG.demoUsername, CONFIG.demoAccessKey);

    let endpoint = request.endpoint;
    let body = request.data;

    return sendRequest(
        request.method,
        `${hubUrl}/session/${sessionId}${endpoint}`,
        body,
        auth
    );
};

/**
 * Deep-replaces all appearances of elementId inside objects and arrays.
 */
function replaceElementIdDeep(obj: any, newId: string): any {
    if (obj === null || obj === undefined) return obj;

    // Replace scalar strings equal to an elementId
    if (typeof obj === "string") {
        return obj;
    }

    // Replace element reference objects
    if (typeof obj === "object") {
        // Handle WebDriver element references
        if (obj.ELEMENT) obj.ELEMENT = newId;
        if (obj["element-6066-11e4-a52e-4f735466cecf"])
            obj["element-6066-11e4-a52e-4f735466cecf"] = newId;

        // Handle W3C Actions API origin element
        if (obj.type === "pointerMove" && obj.origin && typeof obj.origin === "object") {
            if (obj.origin.ELEMENT || obj.origin["element-6066-11e4-a52e-4f735466cecf"]) {
                obj.origin = newId;
            }
        }

        // Deep recursion
        for (const key of Object.keys(obj)) {
            obj[key] = replaceElementIdDeep(obj[key], newId);
        }
    }

    // Handle array recursively
    if (Array.isArray(obj)) {
        return obj.map(item => replaceElementIdDeep(item, newId));
    }

    return obj;
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
