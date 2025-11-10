import { useState } from "react"

export type SessionPlayerProps = {
    parsedTextLogs: ParsedTextLogsResult
    sessionDetails: AutomateSessionResponse
    overridenCaps?: any
    loading?:boolean
    onExecutionStateChange:(executing:boolean)=>void
}
export default function SessionPlayer(props:SessionPlayerProps){
    const {parsedTextLogs, sessionDetails,loading} = props
    const [hubURL,SetHubURL] = useState<string >()
    return (
        <div className="flex flex-col gap-2">
            <label>Hub URL (Optional)</label>
                    <input value={hubURL} onChange={(e)=>SetHubURL(e.target.value)} className="input placeholder-gray-300 w-full" placeholder="Leave empty if you don't want to override" />
                    <button disabled={loading} className="btn btn-neutral ms-auto me-auto" >Execute</button>
        </div>
    )
}