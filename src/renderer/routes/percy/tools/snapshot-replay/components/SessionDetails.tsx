import { highlight } from 'sugar-high';
import Editor from 'react-simple-code-editor';
import Info from './Info';
import StatusBadge from './StatusBadge';

interface SessionInfo {
    sessionId: number;
    status: 'starting' | 'running' | 'terminated' | 'error';
    browserType: string | null;
    childProcessCount: number;
    startTime: number;
    snapshotUrl: string;
}

interface SessionDetailsProps {
    snapshotId: string;
    command: string;
    sessionInfo: SessionInfo | null;
    isExecuting: boolean;
    currentSessionId: number | null;
}

export default function SessionDetails({
    snapshotId,
    command,
    sessionInfo,
    isExecuting,
    currentSessionId
}: SessionDetailsProps) {
    return (
        <div className="grid lg:grid-cols-2">
            <div className="card bg-base-100 p-6">
                <h2 className="card-title text-lg font-semibold mb-4">
                    Snapshot Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <Info label="Input" value={snapshotId || "N/A"} />
                    <Info label="Status">
                        {sessionInfo ? (
                            <StatusBadge status={sessionInfo.status} />
                        ) : (isExecuting ? "Starting..." : "Ready")}
                    </Info>
                    <Info label="Command Type" value="Percy Debug" />
                    {currentSessionId && <Info label="Process ID" value={currentSessionId.toString()} />}
                    {sessionInfo?.browserType && <Info label="Browser" value={sessionInfo.browserType} />}
                    {sessionInfo?.childProcessCount !== undefined && sessionInfo.childProcessCount > 0 && (
                        <Info label="Child Processes" value={sessionInfo.childProcessCount.toString()} />
                    )}
                    {sessionInfo?.startTime && (
                        <Info label="Started" value={new Date(sessionInfo.startTime).toLocaleTimeString()} />
                    )}
                </div>
            </div>
            
            <div className="card bg-base-100 p-6">
                <h2 className="card-title text-lg font-semibold mb-4">
                    Command
                </h2>
                <div className="w-full h-full bg-gray-50 border">
                    <Editor
                        highlight={(code) => highlight(code)}
                        value={command}
                        onValueChange={() => undefined}
                        disabled={true}
                        padding={10}
                        style={{
                            fontFamily: '"Fira code", "Fira Mono", monospace',
                            fontSize: 12,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
