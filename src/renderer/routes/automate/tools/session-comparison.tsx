import Form from "rc-field-form";
import { usePromise } from "../../../hooks/use-promise";
import { toast } from "react-toastify";
import Editor from 'react-simple-code-editor';
import { highlight } from 'sugar-high';
import { useState } from "react";
import { SessionDiffView } from './diffView'; // 👈 Import the new diff component

const { Field } = Form;

// --- UTILITY FUNCTION TO SANITIZE CAPABILITIES ---

/**
 * Removes the sensitive authToken from the capabilities object.
 * @param {object} session - The session object containing capabilities.
 * @returns {object} A new session object with the authToken replaced.
 */
const sanitizeCapabilities = (session: any) => {
    if (!session) {
        return session;
    }

    // Create a deep copy to avoid modifying the original state object directly
    const sanitizedSession = JSON.parse(JSON.stringify(session));

    // Define the path to the auth token within the capabilities structure
    const BSTACK_OPTIONS_PATH = 'bstack:options';
    const ACCESSIBILITY_OPTIONS_PATH = 'accessibilityOptions';
    const AUTH_TOKEN_KEY = 'authToken';

    // 1. Sanitize the top-level 'bstack:options'
    if (sanitizedSession[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
        sanitizedSession[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = '***REDACTED***';
    }
    
    // 2. Sanitize the W3C 'alwaysMatch' 'bstack:options' (if present)
    const alwaysMatch = sanitizedSession.W3C_capabilities?.alwaysMatch;
    if (alwaysMatch?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
        alwaysMatch[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = '***REDACTED***';
    }

    // 3. Sanitize in any 'firstMatch' array entries (if present)
    const firstMatch = sanitizedSession.W3C_capabilities?.firstMatch;
    if (Array.isArray(firstMatch)) {
        firstMatch.forEach((match: any) => {
            if (match?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
                match[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = '***REDACTED***';
            }
        });
    }

    return sanitizedSession;
};

/**
 * Removes the sensitive authToken from the text logs result object.
 * The textLogsResult has a capabilities array that also needs sanitization.
 * @param {object} textLogsResult - The parsed text logs result containing capabilities array.
 * @returns {object} A new textLogsResult object with authTokens redacted.
 */
const sanitizeTextLogs = (textLogsResult: any) => {
    if (!textLogsResult || !textLogsResult.capabilities) {
        return textLogsResult;
    }

    // Create a deep copy
    const sanitized = JSON.parse(JSON.stringify(textLogsResult));

    // Define the path to the auth token
    const BSTACK_OPTIONS_PATH = 'bstack:options';
    const ACCESSIBILITY_OPTIONS_PATH = 'accessibilityOptions';
    const AUTH_TOKEN_KEY = 'authToken';

    // Sanitize each capabilities object in the array
    if (Array.isArray(sanitized.capabilities)) {
        sanitized.capabilities.forEach((cap: any) => {
            // 1. Sanitize top-level bstack:options
            if (cap?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
                cap[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = '***REDACTED***';
            }

            // 2. Sanitize W3C_capabilities.alwaysMatch
            const alwaysMatch = cap.W3C_capabilities?.alwaysMatch;
            if (alwaysMatch?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
                alwaysMatch[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = '***REDACTED***';
            }

            // 3. Sanitize W3C_capabilities.firstMatch array
            const firstMatch = cap.W3C_capabilities?.firstMatch;
            if (Array.isArray(firstMatch)) {
                firstMatch.forEach((match: any) => {
                    if (match?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
                        match[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = '***REDACTED***';
                    }
                });
            }
        });
    }

    return sanitized;
};


// The 'Info' and 'SessionView' components are no longer needed in this file
// as 'SessionDiffView' now handles the rendering.

export default function SessionComparison() {
    // --- STATE AND HOOKS (Unchanged) ---
    const [fetchSessionDetails] = usePromise(window.browserstackAPI.getAutomateSessionDetails);
    const [parseTextLogs] = usePromise(window.browserstackAPI.getAutomateParsedTextLogs);

    const [session, setSession] = useState<any>(null);
    const [textLogsResult, setTextLogsResult] = useState<any>(null);
    const [seleniumLogsA, setSeleniumLogsA] = useState<string | null>(null);
    const [loadingSeleniumA, setLoadingSeleniumA] = useState(false);

    const [session2, setSession2] = useState<any>(null);
    const [textLogsResult2, setTextLogsResult2] = useState<any>(null);
    const [seleniumLogsB, setSeleniumLogsB] = useState<string | null>(null);
    const [loadingSeleniumB, setLoadingSeleniumB] = useState(false);

    const [harLogsA, setHarLogsA] = useState<string | null>(null);
    const [harLogsB, setHarLogsB] = useState<string | null>(null);
    const [loadingHarA, setLoadingHarA] = useState(false);
    const [loadingHarB, setLoadingHarB] = useState(false);

    // Handles loading all data for Session A
    const loadSessionA = async (sessionId: string) => {
        try {
            const rawSessionA = await fetchSessionDetails(sessionId);
            const sessionA = sanitizeCapabilities(rawSessionA); 
            const rawLogsA = await parseTextLogs(rawSessionA);
            const logsA = sanitizeTextLogs(rawLogsA);
            setSession(sessionA);
            setTextLogsResult(logsA); 

            // Load Selenium logs
            setLoadingSeleniumA(true);
            const selA = await window.browserstackAPI.getSeleniumLogs(rawSessionA.automation_session.selenium_logs_url); 
            setSeleniumLogsA(selA);
            setLoadingSeleniumA(false);

            // Load HAR logs
            setLoadingHarA(true);
            const harA = await window.browserstackAPI.getHarLogs(rawSessionA.automation_session.har_logs_url);
            setHarLogsA(harA);
            setLoadingHarA(false);
        } catch (err) {
            console.error("Error in loadSessionA:", err);
            setLoadingSeleniumA(false);
            setLoadingHarA(false);
            throw new Error("Failed to load Session A");
        }
    };

    const loadSessionB = async (sessionId: string) => {
        try {
            const rawSessionB = await fetchSessionDetails(sessionId);
            const sessionB = sanitizeCapabilities(rawSessionB); 
            const rawLogsB = await parseTextLogs(rawSessionB);
            const logsB = sanitizeTextLogs(rawLogsB);
            setSession2(sessionB);
            setTextLogsResult2(logsB);

            // Load Selenium logs
            setLoadingSeleniumB(true);
            const selB = await window.browserstackAPI.getSeleniumLogs(rawSessionB.automation_session.selenium_logs_url);
            setSeleniumLogsB(selB);
            setLoadingSeleniumB(false);

            // Load HAR logs
            setLoadingHarB(true);
            const harB = await window.browserstackAPI.getHarLogs(rawSessionB.automation_session.har_logs_url);
            setHarLogsB(harB);
            setLoadingHarB(false);
        } catch (err) {
            console.error("Error in loadSessionB:", err);
            setLoadingSeleniumB(false);
            setLoadingHarB(false);
            throw new Error("Failed to load Session B");
        }
    };

    // Handles form submission (Unchanged)
    const OpenSession = (input: any) => {
        // Clear previous session data
        setSession(null);
        setTextLogsResult(null);
        setSeleniumLogsA(null);
        setSession2(null);
        setTextLogsResult2(null);
        setSeleniumLogsB(null);

        toast.promise(
            Promise.all([
                loadSessionA(input.sessionIdA),
                loadSessionB(input.sessionIdB)
            ]),
            {
                pending: "Opening Sessions...",
                success: "Sessions Loaded",
                error: {
                    render({ data }) {
                        console.error(data);
                        return "Failed to load one or more sessions. Check console.";
                    },
                },
            }
        );
    };

    // --- RENDER FUNCTION (Passes Sanitized Sessions to SessionDiffView) ---
    return (
        <div className="p-5 space-y-4">
            <h1 className="text-2xl font-bold mb-4">Session Comparison</h1>

            <Form className="flex gap-4" onFinish={OpenSession}>
                <Field name="sessionIdA">
                    <input className="input placeholder-gray-300" placeholder="Session ID A" />
                </Field>

                <Field name="sessionIdB">
                    <input className="input placeholder-gray-300" placeholder="Session ID B" />
                </Field>

                <button type="submit" className="btn btn-primary">
                    Open
                </button>
            </Form>

            <div className="w-full mt-6">
                {/* Show the diff view only when all data for *both* sessions is loaded */}
                {session && session2 && textLogsResult && textLogsResult2 && (
                    <SessionDiffView
                        sessionA={session}
                        sessionB={session2}
                        logsA={textLogsResult}
                        logsB={textLogsResult2}
                        seleniumA={seleniumLogsA}
                        seleniumB={seleniumLogsB}
                        harA={harLogsA}
                        harB={harLogsB}
                        loadingA={loadingSeleniumA}
                        loadingB={loadingSeleniumB}
                        loadingHarA={loadingHarA}
                        loadingHarB={loadingHarB}
                    />
                )}
            </div>
        </div>
    );
}