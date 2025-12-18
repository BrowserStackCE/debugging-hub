import { useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import SessionPlayer from "../../utils/session-player"

export type SessionPlayerProps = {
    parsedTextLogs: ParsedTextLogsResult
    sessionDetails: AutomateSessionResponse
    overridenCaps?: any
    loading?: boolean
    onExecutionStateChange: (executing: boolean) => void
}
type ExecutionLog = {
    index: number;
    timestamp: number;
    req: ParsedTextLogsRequest | string;
    res: any;
    status: "ok" | "error" | "sleep" | "noop";
};
export default function SessionPlayerComponent(props: SessionPlayerProps) {
    const { parsedTextLogs, loading, overridenCaps } = props;
    const [hubURL, SetHubURL] = useState<string>();
    const [isExecuting, SetIsExecuting] = useState(false);
    const [sessionId, SetSessionId] = useState<string>();
    const [isStoppingSession, SetIsStoppingSession] = useState(false);
    const [isSessionStopped, SetIsSessionStopped] = useState(false)
    const sessionPlayer = useMemo(() => {
        return new SessionPlayer(parsedTextLogs, hubURL)
    }, [parsedTextLogs, hubURL])
    const [executionLogs, SetExecutionLogs] = useState<ExecutionLog[]>([]);
    const [newSessionDetails, SetNewSesssionDetails] = useState<AutomateSessionResponse>()

    console.log("Parsed Logs", parsedTextLogs)

    const startSession = async () => {
        SetExecutionLogs([]); // clear logs
        SetIsExecuting(true);

        try {
            const res = await toast.promise(
                sessionPlayer.startSession(overridenCaps),
                {
                    pending: "Starting Session...",
                    error: "Failed to start session",
                    success: "Session Started"
                }
            );

            SetSessionId(res.sessionId);
            const newSessionDetails = await window.browserstackAPI.getAutomateSessionDetails(res.sessionId);
            SetNewSesssionDetails(newSessionDetails)
            await startExecution();

        } catch {
            SetIsExecuting(false);
        }
    };

    const startExecution = async () => {
        let step = 0;

        for await (const data of sessionPlayer.executeNextRequest()) {
            SetExecutionLogs((prev) => [
                ...prev,
                {
                    index: step++,
                    timestamp: Date.now(),
                    req: data.req,
                    res: data.res,
                    status:
                        typeof data.req === "string" && data.req.startsWith("SLEEP")
                            ? "sleep"
                            : data.res?.error
                                ? "error"
                                : "ok"
                }
            ]);
            if (data.res.error) {
                break;
            }
        }

        stopSession()
    };

    const stopSession = async () => {
        SetIsStoppingSession(true);
        try {
            await toast.promise(sessionPlayer.stopSession(), {
                pending: "Stopping Session...",
                error: "Failed to stop session",
                success: "Session Stopped successfully"
            });
        } finally {
            SetIsStoppingSession(false);
            SetIsSessionStopped(true)
        }
    };

    const sessionDone = () => {
        SetIsExecuting(false)
        SetNewSesssionDetails(undefined)
        SetIsSessionStopped(false)
        SetSessionId(undefined)
    }

    const openAutomateSession = () => {
        window.electronAPI.openExternalUrl(newSessionDetails.automation_session.browser_url)
    }

    useEffect(() => {
        props.onExecutionStateChange(isExecuting);
    }, [isExecuting]);

    return (
        <div className="flex flex-col gap-4">
            {!isExecuting ? (
                <button
                    onClick={startSession}
                    disabled={loading}
                    className="btn btn-neutral w-40 mx-auto"
                >
                    Execute
                </button>
            ) : (
                <>
                    <div className="flex w-full items-end gap-4">
                        {newSessionDetails && <button
                            onClick={openAutomateSession}
                            disabled={loading || !newSessionDetails}
                            className="btn btn-neutral w-40"
                        >
                            Open Session
                        </button>}
                        <button
                            onClick={isSessionStopped ? sessionDone : stopSession}
                            disabled={loading || !sessionId}
                            className="btn btn-neutral w-40"
                        >
                            {isSessionStopped ? "Done" : "Stop Session"}
                        </button>
                    </div>

                    {/* logs */}
                    <div className="p-3 rounded h-full overflow-auto font-mono text-xs">
                        {executionLogs.map(log => (
                            <div key={log.index} className="mb-1">
                                <div className="collapse collapse-arrow rounded">

                                    <input type="checkbox" className="peer" />

                                    <label className="collapse-title p-1 min-h-0 leading-tight cursor-pointer">
                                        <span className="opacity-60">{log.index.toString().padStart(2, "0")}</span>{" "}
                                        <span
                                            className={
                                                log.status === "error" ? "text-error" :
                                                    log.status === "sleep" ? "text-warning" :
                                                        "text-success"
                                            }
                                        >
                                            {log.status.toUpperCase()}
                                        </span>{" "}
                                        <span>- {typeof log.req === "string" ? log.req : log.req.commandName}</span>
                                    </label>

                                    <div className="collapse-content p-2">
                                        <div role="tablist" className="tabs tabs-bordered mb-2">
                                            <input type="radio" name={`tab-${log.index}`} role="tab" className="tab" aria-label="Req" defaultChecked />
                                            <div role="tabpanel" className="tab-content p-2">
                                                <pre>{JSON.stringify(log.req, null, 2)}</pre>
                                            </div>

                                            <input type="radio" name={`tab-${log.index}`} role="tab" className="tab" aria-label="Res" />
                                            <div role="tabpanel" className="tab-content p-2">
                                                <pre>{JSON.stringify(log.res, null, 2)}</pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isExecuting && !isSessionStopped && (
                            <span className="loading loading-dots loading-sm" />
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
