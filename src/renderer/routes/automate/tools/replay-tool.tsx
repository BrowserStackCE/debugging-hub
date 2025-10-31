import Form from "rc-field-form";
import { usePromise } from "../../../hooks/use-promise";
import { toast } from "react-toastify";
import Editor from 'react-simple-code-editor';
import { highlight } from 'sugar-high'
const { Field } = Form

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col bg-base-200 rounded-lg p-3">
            <span className="text-xs text-base-content/70 uppercase tracking-wide">{label}</span>
            <span className="font-medium text-base-content">{value}</span>
        </div>
    );
}

export default function ReplayTool() {
    const [fetchSessionDetails, fetchingSession, session] = usePromise(window.browserstackAPI.getAutomateSessionDetails);
    const [parseTextLogs, parsingTextLogs, textLogsResult] = usePromise(window.browserstackAPI.getAutomateParsedTextLogs)

    const OpenSession = (input: any) => {
        toast.promise(fetchSessionDetails(input.sessionId).then((res) => parseTextLogs(res)), {
            pending: "Opening Session...",
            success: "Session Loaded",
            error: "Failed to Load session probably invalid session ID. Please check console for errors"
        }).catch((err) => {
            console.error(err)
        })
    }

    console.log(textLogsResult)

    return (
        <div className="p-5 space-y-4">
            <h1 className="text-2xl font-bold mb-4" >Replay Toolkit</h1>
            <Form className="flex gap-4" onFinish={OpenSession} >
                <Field name="sessionId" >
                    <input className="input placeholder-gray-300" placeholder="Session ID" />
                </Field>
                <button disabled={fetchingSession} type="submit" className="btn btn-primary" >Open</button>
            </Form>
            {session && <>
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
                        <div className="w-full h-full bg-gray-50">
                            <Editor
                                highlight={(code)=>highlight(code)}
                                onValueChange={console.log}
                                value={JSON.stringify(textLogsResult.capabilities[0],undefined,2)}
                                padding={10}
                                style={{
                                    fontFamily: '"Fira code", "Fira Mono", monospace',
                                    fontSize: 12,
                                }}
                            />
                        </div>
                    </div>}
                </div>
            </>}
        </div>
    )
}