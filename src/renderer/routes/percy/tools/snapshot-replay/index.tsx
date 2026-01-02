import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import Form, { Field } from 'rc-field-form';
import { DebugOptionsForm, SessionDetails, TerminalOutput } from './components';

interface SessionInfo {
    sessionId: number;
    status: 'starting' | 'running' | 'terminated' | 'error';
    browserType: string | null;
    childProcessCount: number;
    startTime: number;
    snapshotUrl: string;
}


export default function SnapshotReplay() {
    const [snapshotId, setSnapshotId] = useState("");
    const [isExecuting, setIsExecuting] = useState(false);
    const [commandOutput, setCommandOutput] = useState("");
    const [command, setCommand] = useState("");
    const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
    const [isTerminating, setIsTerminating] = useState(false);
    const listenerRef = useRef<((...args: any[]) => void) | null>(null);
    
    // Percy debug options
    const [browser, setBrowser] = useState('chrome');
    const [width, setWidth] = useState('');
    const [headless, setHeadless] = useState(false);
    const [withBaseline, setWithBaseline] = useState(false);
    const [saveResources, setSaveResources] = useState(false);
    const [bstackLocalKey, setBstackLocalKey] = useState('');
    const [percyToken, setPercyToken] = useState('');

    useEffect(() => {
        const loadAccessKey = async () => {
            try {
                let credentials = await window.credentialsAPI.getBrowserStackDemoCredentials();
                if (!credentials) {
                    credentials = await window.credentialsAPI.getBrowserStackAdminCredentials();
                }
                if (credentials) {
                    setBstackLocalKey(credentials.accessKey);
                }
            } catch (error) {
                console.error('Failed to load access key:', error);
            }
        };
        loadAccessKey();
    }, []);

    const handleReplay = async (values: { snapshotId: string }) => {
        const { snapshotId: inputSnapshotId } = values;
        setSnapshotId(inputSnapshotId);
        
        if (!inputSnapshotId?.trim()) {
            toast.error("Please enter a snapshot ID or link");
            return;
        }

        if (!percyToken?.trim()) {
            toast.error("Please enter the master Percy token");
            return;
        }

        setIsExecuting(true);
        setCommandOutput("");
        setTerminalLogs([]);
        setSessionInfo(null);
        setCurrentSessionId(null);
        setIsTerminating(false);

        try {
            let debugUrl = inputSnapshotId.trim();
            if (!debugUrl.startsWith('http')) {
                debugUrl = `https://percy.io/9560f98d/web/bstack-staging-docs/builds/45840493/changed/${debugUrl}`;
            }

            const commandOptions = [];
            if (browser !== 'chrome') commandOptions.push(`--${browser}`);
            if (headless) commandOptions.push('--headless');
            if (withBaseline) commandOptions.push('--with-baseline');
            if (saveResources) commandOptions.push('--save-resources');
            if (width && width.trim() !== '' && width !== '1920') commandOptions.push(`--width ${width}`);
            
            const optionsString = commandOptions.length > 0 ? ` ${commandOptions.join(' ')}` : '';
            const percyCommand = `export BSTACK_LOCAL_KEY=${bstackLocalKey}\nexport PERCY_TOKEN=${percyToken}\nnpx percy support:debug "${debugUrl}"${optionsString}`;
            setCommand(percyCommand);

            const result = await window.browserstackAPI.executePercyDebugCommand(debugUrl, {
                browser: browser !== 'chrome' ? browser : undefined,
                width: width && width.trim() !== '' ? width : undefined,
                headless,
                withBaseline,
                saveResources,
                bstackLocalKey,
                percyToken
            });
            if (result.success && result.processId) {
                setCurrentSessionId(result.processId);
                setSessionInfo({
                    sessionId: result.processId,
                    status: 'running',
                    browserType: null,
                    childProcessCount: 0,
                    startTime: Date.now(),
                    snapshotUrl: debugUrl
                });
                toast.info(`Percy session started with PID: ${result.processId}`);
                
                setTimeout(() => {
                    setIsExecuting(false);
                }, 10000);
            } else {
                throw new Error(result.error || 'Failed to start Percy debug command');
            }
        } catch (error) {
            toast.error("Failed to execute replay command");
            setCommandOutput(`Error: ${(error as Error).message}`);
            setIsExecuting(false);
            setCurrentSessionId(null);
        }
    };

    useEffect(() => {
        if (listenerRef.current) {
            window.electronAPI.ipcRenderer.removeListener('percy-debug-log', listenerRef.current);
            listenerRef.current = null;
        }
        
        const listener = (_event: any, data: any) => {
            if (currentSessionId && data.sessionId && data.sessionId !== currentSessionId) {
                return;
            }
            
            if (data.log) {
                setTerminalLogs(prev => {
                    const newLogs = [...prev, data.log];
                    return newLogs.slice(-500);
                });
            }
            
            if (data.browserLaunched) {
                const browserType = data.browserType || 'browser';
                setIsExecuting(false);
                toast.success(`${browserType.charAt(0).toUpperCase() + browserType.slice(1)} browser launched! You can now terminate the session when done.`);
                
                setSessionInfo(prev => prev ? {
                    ...prev,
                    status: 'running',
                    browserType: data.browserType || 'unknown'
                } : null);
            }
            
            if (data.event === 'close') {
                if (data.reason === 'manual_termination') {
                    setIsExecuting(false);
                    setSessionInfo(prev => prev ? {
                        ...prev,
                        status: 'terminated'
                    } : null);
                    setCurrentSessionId(null);
                    setIsTerminating(false);
                    
                    setTerminalLogs(prev => [...prev, "\n--- Session Terminated by User ---"]);
                    return;
                }
                
                if (isTerminating) {
                    return;
                }
                
                setIsExecuting(false);
                setSessionInfo(prev => prev ? {
                    ...prev,
                    status: 'terminated'
                } : null);
                setCurrentSessionId(null);
                
                const message = data.reason === 'process_died' 
                    ? `\n--- Process Died (code: ${data.code}) ---`
                    : data.reason === 'natural_exit'
                    ? `\n--- Session Ended Naturally (code: ${data.code}) ---`
                    : `\n--- Session Terminated (code: ${data.code}) ---`;
                
                setTerminalLogs(prev => [...prev, message]);
                
                if (data.reason !== 'process_died' && data.reason !== 'natural_exit') {
                    toast.info(`Session terminated with code ${data.code}`);
                }
            }
            
            if (data.event === 'error') {
                toast.error(`Session error: ${data.message}`);
                setIsExecuting(false);
                setSessionInfo(prev => prev ? {
                    ...prev,
                    status: 'error'
                } : null);
                setCurrentSessionId(null);
            }
        };

        listenerRef.current = listener;
        window.electronAPI.ipcRenderer.on('percy-debug-log', listener);

        return () => {
            if (listenerRef.current) {
                window.electronAPI.ipcRenderer.removeListener('percy-debug-log', listenerRef.current);
                listenerRef.current = null;
            }
        };
    }, []);

    const handleTerminate = async () => {
        if (!currentSessionId) {
            toast.error("No active session to terminate");
            return;
        }

        setIsTerminating(true);
        
        try {
            toast.info("Terminating Percy session...");
            const result = await window.browserstackAPI.terminatePercySession(currentSessionId);
            
            if (result.success) {
                toast.success(result.message || "Percy session terminated successfully");
            } else {
                throw new Error(result.error || "Failed to terminate session");
            }
        } catch (error) {
            toast.error("Failed to terminate session");
            setIsTerminating(false);
        }
    };
    
    const canTerminate = currentSessionId !== null && sessionInfo?.status === 'running' && !isTerminating && sessionInfo?.sessionId === currentSessionId;

    return (
        <div className="p-5 space-y-6">
            <div className="card bg-base-100 shadow-sm border">
                <div className="card-body">
                    <h2 className="card-title text-xl font-semibold mb-6">Snapshot Replay</h2>
                    
                    <Form className="space-y-6" onFinish={handleReplay}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <Field name="snapshotId">
                                    <input 
                                        className="input input-bordered w-full bg-gray-50 border-gray-300 text-gray-600 placeholder:text-gray-400" 
                                        placeholder="Enter snapshot ID or link" 
                                    />
                                </Field>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    disabled={currentSessionId !== null || isExecuting} 
                                    type="submit" 
                                    className="bg-black text-white hover:bg-gray-800 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
                                >
                                    {isExecuting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm"></span>
                                            Executing
                                        </>
                                    ) : (
                                        "Replay"
                                    )}
                                </button>
                                {canTerminate && (
                                    <button 
                                        onClick={handleTerminate}
                                        className="bg-black text-white hover:bg-gray-800 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
                                    >
                                        Terminate
                                    </button>
                                )}
                            </div>
                        </div>

                        <DebugOptionsForm
                            browser={browser}
                            width={width}
                            headless={headless}
                            withBaseline={withBaseline}
                            saveResources={saveResources}
                            bstackLocalKey={bstackLocalKey}
                            percyToken={percyToken}
                            onBrowserChange={setBrowser}
                            onWidthChange={setWidth}
                            onHeadlessChange={setHeadless}
                            onWithBaselineChange={setWithBaseline}
                            onSaveResourcesChange={setSaveResources}
                            onBstackLocalKeyChange={setBstackLocalKey}
                            onPercyTokenChange={setPercyToken}
                            disabled={currentSessionId !== null}
                        />
                    </Form>
                </div>
            </div>

            {command && (
                <SessionDetails
                    snapshotId={snapshotId}
                    command={command}
                    sessionInfo={sessionInfo}
                    isExecuting={isExecuting}
                    currentSessionId={currentSessionId}
                />
            )}

            {(command || terminalLogs.length > 0) && (
                <TerminalOutput
                    terminalLogs={terminalLogs}
                    onClearLogs={() => setTerminalLogs([])}
                />
            )}

            {commandOutput && (
                <details className="collapse collapse-arrow bg-base-100 border border-base-300" name="my-accordion-det-1" open={false}>
                    <summary className="collapse-title font-semibold">Command Output</summary>
                    <div className="collapse-content">
                        <div className="mockup-code">
                            <pre className="text-sm whitespace-pre-wrap">{commandOutput}</pre>
                        </div>
                    </div>
                </details>
            )}
        </div>
    );
}
