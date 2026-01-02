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

// Enhanced process tracking with process groups and child process monitoring
interface ProcessSession {
    mainProcess: any;
    processGroupId: number;
    childProcesses: Set<number>;
    browserType: string | null;
    status: 'starting' | 'running' | 'terminated' | 'error';
    startTime: number;
    snapshotUrl: string;
}

// Active sessions tracking
const activeSessions = new Map<number, ProcessSession>();

// Utility to find all processes in a process group
const findProcessGroupProcesses = async (pgid: number): Promise<number[]> => {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        
        exec(`ps -o pid= -g ${pgid}`, (error: any, stdout: string) => {
            if (error) {
                resolve([]);
                return;
            }
            
            const pids = stdout.trim().split('\n')
                .filter((pid: string) => pid.trim())
                .map((pid: string) => parseInt(pid.trim()))
                .filter((pid: number) => !isNaN(pid));
            
            resolve(pids);
        });
    });
};

// Enhanced browser detection
const detectBrowserProcess = async (pgid: number): Promise<{ found: boolean; browserType: string; pids: number[] }> => {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        
        // Look for common browser processes in the process group
        exec(`ps -o pid=,comm= -g ${pgid}`, (error: any, stdout: string) => {
            if (error) {
                resolve({ found: false, browserType: '', pids: [] });
                return;
            }
            
            const lines = stdout.trim().split('\n');
            const browserPids: number[] = [];
            let detectedBrowser = '';
            
            for (const line of lines) {
                const [pidStr, comm] = line.trim().split(/\s+/);
                const pid = parseInt(pidStr);
                
                if (isNaN(pid)) continue;
                
                // Check for various browser processes
                const browserTypes = [
                    { name: 'chrome', patterns: ['chrome', 'chromium', 'google-chrome'] },
                    { name: 'firefox', patterns: ['firefox', 'firefox-bin'] },
                    { name: 'safari', patterns: ['safari', 'safaridriver'] },
                    { name: 'edge', patterns: ['edge', 'msedge'] }
                ];
                
                for (const browser of browserTypes) {
                    if (browser.patterns.some(pattern => comm.toLowerCase().includes(pattern))) {
                        detectedBrowser = browser.name;
                        browserPids.push(pid);
                        break;
                    }
                }
            }
            
            resolve({ 
                found: browserPids.length > 0, 
                browserType: detectedBrowser, 
                pids: browserPids 
            });
        });
    });
};

// Monitor process lifecycle
const monitorSession = async (sessionId: number) => {
    const session = activeSessions.get(sessionId);
    if (!session) return;
    
    const checkInterval = setInterval(async () => {
        try {
            // Check if session still exists and is not terminated
            const currentSession = activeSessions.get(sessionId);
            if (!currentSession || currentSession.status === 'terminated') {
                clearInterval(checkInterval);
                return;
            }
            
            // Check if main process is still running
            const { exec } = require('child_process');
            
            exec(`kill -0 ${session.mainProcess.pid}`, (error: any) => {
                if (error) {
                    // Main process died, clean up session
                    clearInterval(checkInterval);
                    session.status = 'terminated';
                    activeSessions.delete(sessionId);
                    
                    // Notify UI only if this wasn't a manual termination
                    session.mainProcess.webContents?.send('percy-debug-log', { 
                        event: 'close', 
                        code: 0,
                        sessionId: sessionId,
                        reason: 'process_died'
                    });
                }
            });
            
            // Update child processes and browser detection
            const allChildPids = await findProcessGroupProcesses(session.processGroupId);
            session.childProcesses = new Set(allChildPids.filter(pid => pid !== session.mainProcess.pid));
            
            const browserInfo = await detectBrowserProcess(session.processGroupId);
            if (browserInfo.found && !session.browserType) {
                session.browserType = browserInfo.browserType;
                session.status = 'running';
                
                session.mainProcess.webContents?.send('percy-debug-log', { 
                    browserLaunched: true, 
                    browserType: browserInfo.browserType,
                    sessionId: sessionId 
                });
            }
            
        } catch (error) {
            console.error('Error monitoring session:', error);
        }
    }, 2000); // Check every 2 seconds
    
    // Stop monitoring after 10 minutes to prevent memory leaks
    setTimeout(() => {
        clearInterval(checkInterval);
    }, 10 * 60 * 1000);
};

export const executePercyDebugCommand = async (snapshotUrl: string, options?: {
    browser?: string;
    width?: string;
    headless?: boolean;
    withBaseline?: boolean;
    saveResources?: boolean;
    bstackLocalKey?: string;
    percyToken?: string;
}, webContents?: Electron.WebContents) => {
    const PERCY_TOKEN = options?.percyToken;
    const BSTACK_LOCAL_KEY = options?.bstackLocalKey || CONFIG.demoAccessKey;
    
    if (!PERCY_TOKEN) {
        throw new Error('Percy token is required for snapshot replay');
    }
    
    try {
        const { spawn } = require('child_process');
        
        // Build command with options
        const commandOptions = [];
        if (options?.browser && options.browser !== 'chrome') commandOptions.push(`--${options.browser}`);
        if (options?.headless) commandOptions.push('--headless');
        if (options?.withBaseline) commandOptions.push('--with-baseline');
        if (options?.saveResources) commandOptions.push('--save-resources');
        if (options?.width && options.width.trim() !== '' && options.width !== '1920') commandOptions.push(`--width ${options.width}`);
        
        const optionsString = commandOptions.length > 0 ? ` ${commandOptions.join(' ')}` : '';
        const command = `npx percy support:debug "${snapshotUrl}"${optionsString}`;
        
        const child = spawn(command, {
            shell: true,
            env: {
                ...process.env,
                PERCY_TOKEN: PERCY_TOKEN,
                BSTACK_LOCAL_KEY: BSTACK_LOCAL_KEY
            },
            detached: true, // Create new process group
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        // Create session tracking
        const session: ProcessSession = {
            mainProcess: child,
            processGroupId: child.pid,
            childProcesses: new Set(),
            browserType: null,
            status: 'starting',
            startTime: Date.now(),
            snapshotUrl: snapshotUrl
        };
        
        activeSessions.set(child.pid, session);
        
        // Start monitoring the session
        monitorSession(child.pid);
        
        let stdout = '';
        let stderr = '';
        let hasSentInitialLogs = false;
        
        // Add initial logs only once
        if (!hasSentInitialLogs) {
            webContents?.send('percy-debug-log', { 
                log: `export BSTACK_LOCAL_KEY=${BSTACK_LOCAL_KEY}`,
                sessionId: child.pid 
            });
            webContents?.send('percy-debug-log', { 
                log: `export PERCY_TOKEN=${PERCY_TOKEN}`,
                sessionId: child.pid 
            });
            webContents?.send('percy-debug-log', { 
                log: `$ npx percy support:debug "${snapshotUrl}"${optionsString}`,
                sessionId: child.pid 
            });
            webContents?.send('percy-debug-log', { 
                log: `Process ID: ${child.pid} (Process Group: ${child.pid})`,
                sessionId: child.pid 
            });
            hasSentInitialLogs = true;
        }

        child.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            stdout += output;
            output.split('\n').forEach(line => {
                if (line.trim()) {
                    // Filter out duplicate initial commands that Percy might echo
                    if (line.includes('export PERCY_TOKEN=') || 
                        line.includes('npx percy support:debug') ||
                        line.includes('Process ID:')) {
                        return; // Skip these lines as we already sent them
                    }
                    webContents?.send('percy-debug-log', { log: line, sessionId: child.pid });
                }
            });
        });
        
        child.stderr?.on('data', (data: Buffer) => {
            const error = data.toString();
            stderr += error;
            error.split('\n').forEach(line => {
                if (line.trim()) {
                    // Filter out duplicate initial commands that Percy might echo
                    if (line.includes('export PERCY_TOKEN=') || 
                        line.includes('npx percy support:debug') ||
                        line.includes('Process ID:')) {
                        return; // Skip these lines as we already sent them
                    }
                    webContents?.send('percy-debug-log', { log: line, sessionId: child.pid });
                }
            });
        });
        
        child.on('close', async (code: number | null) => {
            const session = activeSessions.get(child.pid);
            if (session) {
                session.status = 'terminated';
                activeSessions.delete(child.pid);
                
                // Notify UI of natural process termination
                webContents?.send('percy-debug-log', { 
                    event: 'close', 
                    code,
                    sessionId: child.pid,
                    reason: 'natural_exit'
                });
            }
        });
        
        child.on('error', (error: Error) => {
            const session = activeSessions.get(child.pid);
            if (session) {
                session.status = 'error';
                activeSessions.delete(child.pid);
            }
            
            webContents?.send('percy-debug-log', { 
                event: 'error', 
                message: error.message,
                sessionId: child.pid 
            });
        });
        
        // Return the session ID immediately so UI can track it
        return { success: true, processId: child.pid };
        
    } catch (error) {
        console.error('Error executing Percy debug command:', error);
        return {
            success: false,
            error: (error as Error).message,
            logs: [`Error: ${(error as Error).message}`]
        };
    }
}

export const terminatePercySession = async (processId: number) => {
    try {
        const session = activeSessions.get(processId);
        
        if (!session) {
            return {
                success: false,
                error: 'Session not found or already terminated'
            };
        }
        
        // Mark session as terminated immediately to prevent monitoring conflicts
        session.status = 'terminated';
        
        // Send manual termination event BEFORE killing the process
        session.mainProcess.webContents?.send('percy-debug-log', {
            event: 'close',
            code: 0,
            sessionId: processId,
            reason: 'manual_termination'
        });
        
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            // First, try to terminate the entire process group
            exec(`kill -TERM -${session.processGroupId}`, (error: any) => {
                if (error) {
                    console.log('Graceful termination failed, using forceful termination');
                    
                    // Force kill the entire process group
                    exec(`kill -KILL -${session.processGroupId}`, (error2: any) => {
                        if (error2) {
                            // Fallback: kill individual processes
                            const killPromises: Promise<any>[] = [];
                            
                            // Kill main process
                            killPromises.push(new Promise((killResolve) => {
                                exec(`kill -KILL ${session.mainProcess.pid}`, (killError: any) => {
                                    killResolve({ pid: session.mainProcess.pid, error: killError });
                                });
                            }));
                            
                            // Kill all child processes
                            session.childProcesses.forEach(childPid => {
                                killPromises.push(new Promise((killResolve) => {
                                    exec(`kill -KILL ${childPid}`, (killError: any) => {
                                        killResolve({ pid: childPid, error: killError });
                                    });
                                }));
                            });
                            
                            Promise.all(killPromises).then(() => {
                                // Clean up session regardless of individual kill results
                                activeSessions.delete(processId);
                                
                                resolve({
                                    success: true,
                                    message: 'Percy session terminated forcefully'
                                });
                            });
                        } else {
                            // Successful force kill
                            activeSessions.delete(processId);
                            
                            resolve({
                                success: true,
                                message: 'Percy session terminated forcefully'
                            });
                        }
                    });
                } else {
                    // Graceful termination succeeded
                    
                    // Wait a moment and check if processes are still running
                    setTimeout(() => {
                        exec(`kill -0 -${session.processGroupId}`, (checkError: any) => {
                            if (checkError) {
                                // Process group is dead
                                activeSessions.delete(processId);
                                
                                resolve({
                                    success: true,
                                    message: 'Percy session terminated gracefully'
                                });
                            } else {
                                // Still running, force kill
                                exec(`kill -KILL -${session.processGroupId}`, (forceError: any) => {
                                    activeSessions.delete(processId);
                                    
                                    resolve({
                                        success: true,
                                        message: forceError ? 'Percy session terminated with mixed results' : 'Percy session terminated forcefully'
                                    });
                                });
                            }
                        });
                    }, 2000); // Wait 2 seconds for graceful termination
                }
            });
        });
        
    } catch (error) {
        console.error('Error terminating Percy session:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
}

// Utility to get session info
export const getSessionInfo = (sessionId: number) => {
    const session = activeSessions.get(sessionId);
    return session ? {
        sessionId: session.mainProcess.pid,
        status: session.status,
        browserType: session.browserType,
        childProcessCount: session.childProcesses.size,
        startTime: session.startTime,
        snapshotUrl: session.snapshotUrl
    } : null;
}

// Utility to list all active sessions
export const getActiveSessions = () => {
    return Array.from(activeSessions.entries()).map(([pid, session]) => ({
        sessionId: pid,
        status: session.status,
        browserType: session.browserType,
        childProcessCount: session.childProcesses.size,
        startTime: session.startTime,
        snapshotUrl: session.snapshotUrl
    }));
}
