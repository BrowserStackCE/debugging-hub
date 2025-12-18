import Form from "rc-field-form";
import { usePromise } from "../../../hooks/use-promise";
import { toast } from "react-toastify";
import Editor from 'react-simple-code-editor';
import { highlight } from 'sugar-high'
import { useState } from "react";
import SessionPlayer from "../../../components/replay-tool/session-player";
import RequestCard from "../../../components/replay-tool/request-card";
const { Field } = Form

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col bg-base-200 rounded-lg p-3">
            <span className="text-xs text-base-content/70 uppercase tracking-wide">{label}</span>
            <span title={value} className="font-medium text-base-content truncate text-ellipsis">{value}</span>
        </div>
    );
}

function RemoveUnwantedCaps(capabilities: any) {
    console.log(capabilities)
    const keysToRemove = [
        "W3C_capabilities",
        "new_bucketing",
        "detected_language",
        "bstack:options.testhubBuildUuid",
        "bstack:options.buildProductMap",
        "bstack:options.accessibilityOptions",
        "bstack:options.accessibility",
        "bstack:options.browserstackSDK",
        "bstack:options.hostName"
    ]

    const cleanedCaps = typeof capabilities == 'string' ? JSON.parse(capabilities) : { ...capabilities };

    for (const key of keysToRemove) {
        // Handle dot notation like "bstack:options.testhubBuildUuid"
        if (key.includes(".")) {
            const parts = key.split(".");
            const parentKey = parts[0];
            const childKey = parts[1];

            if (
                cleanedCaps[parentKey] &&
                typeof cleanedCaps[parentKey] === "object"
            ) {
                delete cleanedCaps[parentKey][childKey];
            }
        } else {
            // Remove top-level key
            delete cleanedCaps[key];
        }
    }

    return JSON.stringify(cleanedCaps, undefined, 2);
}

export default function ReplayTool() {
    const [fetchSessionDetails, fetchingSession, session] = usePromise(window.browserstackAPI.getAutomateSessionDetails);
    const [parseTextLogs, parsingTextLogs, textLogsResult] = usePromise(window.browserstackAPI.getAutomateParsedTextLogs)
    const [capabilities, SetCapabilities] = useState<string>('')
    const [isExecuting, SetIsExecuting] = useState(false)
    const [hubURL, SetHubURL] = useState<string>(null)
    const OpenSession = (input: any) => {
        toast.promise(fetchSessionDetails(input.sessionId).then((res) => parseTextLogs(res)), {
            pending: "Opening Session...",
            success: "Session Loaded",
            error: "Failed to Load session probably invalid session ID. Please check console for errors"
        }).then((res) => {
            SetCapabilities(RemoveUnwantedCaps(res.capabilities[0]))
        }).catch((err) => {
            console.error(err)
        })

    }


    return (
        <div className="p-5 space-y-4">
            <h1 className="text-2xl font-bold mb-4" >Replay Toolkit</h1>
            <Form className="flex gap-4" onFinish={OpenSession} >
                <Field name="sessionId" >
                    <input className="input placeholder-gray-300" placeholder="Session ID" />
                </Field>
                <button disabled={fetchingSession || isExecuting} type="submit" className="btn btn-neutral" >Open</button>
            </Form>
            {textLogsResult && session && !isExecuting && <>
                <div className="grid lg:grid-cols-2">
                    <div className="card bg-base-100 p-6">
                        <h2 className="card-title text-lg font-semibold mb-4">
                            {session.automation_session.name || "Unnamed Session"}
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <Info label="Project" value={session.automation_session.project_name} />
                            <Info label="Build" value={session.automation_session.build_name} />
                            <Info label="Status" value={session.automation_session.status} />
                            <Info label="OS" value={`${session.automation_session.os} ${session.automation_session.os_version}`} />
                            <Info label="Browser" value={`${session.automation_session.browser} ${session.automation_session.browser_version}`} />
                            <Info label="Device" value={session.automation_session.device || "N/A"} />
                            <Info label="Duration" value={`${session.automation_session.duration}s`} />
                            <Info label="Created At" value={new Date(session.automation_session.created_at).toLocaleString()} />
                        </div>
                    </div>
                    {textLogsResult && <div className="card bg-base-100 p-6">
                        <h2 className="card-title text-lg font-semibold mb-4">
                            Capabilities
                        </h2>
                        <div className="w-full h-full bg-gray-50 border">
                            <Editor
                                highlight={(code) => highlight(code)}
                                onValueChange={(caps) => SetCapabilities(caps)}
                                value={capabilities}
                                disabled={isExecuting}
                                padding={10}
                                style={{
                                    fontFamily: '"Fira code", "Fira Mono", monospace',
                                    fontSize: 12,
                                }}
                            />
                        </div>
                    </div>}

                </div>
                {textLogsResult && <details className="collapse collapse-arrow bg-base-100 border border-base-300" name="my-accordion-det-1" open={false}>
                    <summary className="collapse-title font-semibold">Commands</summary>
                    <div className="collapse-content">
                        {textLogsResult.requests.map((request) => (
                            <RequestCard request={request} />
                        ))}
                    </div>
                </details>}

                {textLogsResult && <div className="flex flex-col w-full gap-4">
                    {textLogsResult && !isExecuting && <div className="flex flex-col gap-2">
                        <label>Hub URL (Optional)</label>
                        <select value={hubURL} onChange={(e) => SetHubURL(e.target.value)} className="select placeholder-gray-300 w-full" defaultValue="Default">
                            <option disabled={true}>Default</option>
                        </select>
                    </div>}
                </div>}
            </>}
            {textLogsResult && <SessionPlayer
                loading={parsingTextLogs || fetchingSession}
                parsedTextLogs={textLogsResult}
                sessionDetails={session}
                overridenCaps={capabilities}
                onExecutionStateChange={SetIsExecuting}
            />}
        </div>
    )
}