import { useRef, useEffect } from 'react';

interface TerminalOutputProps {
    terminalLogs: string[];
    onClearLogs: () => void;
}

export default function TerminalOutput({ terminalLogs, onClearLogs }: TerminalOutputProps) {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalLogs]);

    return (
        <div className="card bg-base-100 p-6">
            <h2 className="card-title text-lg font-semibold mb-4">
                Terminal Output
            </h2>
            <div className="mockup-code bg-black text-green-400">
                <div className="h-96 overflow-y-auto p-4" ref={terminalRef}>
                    {terminalLogs.length === 0 ? (
                        <div className="text-gray-500 font-mono text-sm">Waiting for terminal output...</div>
                    ) : (
                        terminalLogs.map((log, index) => (
                            <div key={index} className="font-mono text-sm leading-relaxed">
                                {log}
                            </div>
                        ))
                    )}
                </div>
                <div className="border-t border-gray-700 p-2">
                    <button 
                        onClick={onClearLogs}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        Clear Logs
                    </button>
                </div>
            </div>
        </div>
    );
}
