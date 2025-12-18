import React, { useState } from "react";

export default function RequestCard({ request }: { request: ParsedTextLogsRequest | string }) {
    const isString = typeof request === "string";

    // If string → show simple message card
    if (isString) {
        return (
            <div className="card bg-base-200 shadow-sm border border-base-300 my-3">
                <div className="card-body py-3">
                    <span className="font-mono text-sm">{request}</span>
                </div>
            </div>
        );
    }

    // Structured request version
    const { method, endpoint, data, commandName } = request;
    const [open, setOpen] = useState(true);

    const methodColor = {
        GET: "badge-info",
        POST: "badge-success",
        DELETE: "badge-error",
        PUT: "badge-warning",
    }[method] || "badge-neutral";

    return (
        <div className="card bg-base-200 shadow-md border border-base-300 my-3">
            <div className="card-body gap-2">

                {/* Header row */}
                <div className="flex justify-between items-start">
                    <div>
                        <span className={`badge ${methodColor} mr-2`}>{method}</span>
                        <span className="font-mono text-sm opacity-80">{commandName}</span>

                        {commandName && (
                            <div className="text-xs opacity-60 mt-1">
                                Endpoint: <span className="font-semibold">{endpoint}</span>
                            </div>
                        )}
                    </div>

                    {/* Toggle JSON button */}
                    {/* {data && (
                        <button
                            className="btn btn-xs btn-outline"
                            onClick={() => setOpen(!open)}
                        >
                            {open ? "Hide Data" : "Show Data"}
                        </button>
                    )} */}
                </div>

                {/* Data area */}
                {open && data && (
                    <pre className="mt-2 bg-base-300 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}
