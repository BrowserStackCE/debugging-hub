import Form from "rc-field-form";
import { usePromise } from "../../../hooks/use-promise";
import { useState } from "react";
import { toast } from "react-toastify";

const { Field } = Form;

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col bg-base-200 rounded-lg p-3">
      <span className="text-xs text-base-content/70 uppercase tracking-wide">
        {label}
      </span>
      <span
        title={value}
        className="font-medium text-base-content truncate text-ellipsis"
      >
        {value}
      </span>
    </div>
  );
}


export default function LatencyFinder() {

  const [fetchSessionDetails, fetchingSession, session] = usePromise(
    window.browserstackAPI.getAutomateSessionDetails
  );

  const [parseSessionLogs, parsingSessionLogs, sessionLogsResult] = usePromise(
    window.browserstackAPI.getAutomateParsedSessionLogs
  );
  const [sessionLogsSummary, SetSessionLogsSummary] = useState<Summary | null>(null);


  //  const [isExecuting, SetIsExecuting] = useState(false);
  const OpenSession = (input: any) => {
      toast
        .promise(
          fetchSessionDetails(input.sessionId).then((res) => parseSessionLogs(res)),
          {
            pending: "Opening Session...",
            success: "Session Loaded",
            error:
              "Failed to Load session probably invalid session ID. Please check console for errors",
          }
        )
        .then((res) => {
          SetSessionLogsSummary(res.summary);
        })
        .catch((err) => {
          console.error(err);
        });
    };
  return (
    <div className="p-5 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Latency Finder</h1>
      <Form className="flex gap-4" onFinish={OpenSession}>
        <Field name="sessionId">
          <input
            className="input placeholder-gray-300"
            placeholder="Session ID"
          />
        </Field>
        <button
          disabled={fetchingSession}
          type="submit"
          className="btn btn-neutral"
        >
          Analyse
        </button>
      </Form>
      {session && (
        <>
          <div className="grid lg:grid-cols-2">
            <div className="card bg-base-100 p-6">
              <h2 className="card-title text-lg font-semibold mb-4">
                {session.automation_session.name || "Unnamed Session"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <Info
                  label="Project"
                  value={session.automation_session.project_name}
                />
                <Info
                  label="Build"
                  value={session.automation_session.build_name}
                />
                <Info
                  label="Status"
                  value={session.automation_session.status}
                />
                <Info
                  label="OS"
                  value={`${session.automation_session.os} ${session.automation_session.os_version}`}
                />
                <Info
                  label="Browser"
                  value={`${session.automation_session.browser} ${session.automation_session.browser_version}`}
                />
                <Info
                  label="Device"
                  value={session.automation_session.device || "N/A"}
                />
                <Info
                  label="Duration"
                  value={`${session.automation_session.duration}s`}
                />
                <Info
                  label="Created At"
                  value={new Date(
                    session.automation_session.created_at
                  ).toLocaleString()}
                />
              </div>
            </div>
          </div>
        </>
      )}
       {sessionLogsSummary && (
        <>
        <h1 className="card-title text-2xl font-bold mb-4">Session Logs</h1>
          <div className="grid lg:grid-cols-2">
            <div className="card bg-base-100 p-6">
              <h2 className="card-title text-lg font-semibold mb-2" >Log Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <Info
                  label="Total Requests"
                  value={sessionLogsSummary.total_requests.toString()}
                />
                <Info
                  label="Session Started At"
                  value={new Date(sessionLogsSummary.session_started_at || 0).toLocaleString()}
                />
                <Info
                  label="Session Completed At"
                  value={new Date(sessionLogsSummary.session_completed_at || 0).toLocaleString()}
                />
                <Info
                  label="Session Duration"
                  value={sessionLogsSummary.session_duration ? (sessionLogsSummary.session_duration / 1000).toString() : "N/A"}
                />
              </div>
              <h2 className="card-title text-lg font-semibold mb-2 mt-4" >Time Stats (In Seconds)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <Info
                  label="Setup Time"
                  value={(sessionLogsSummary.setup_time / 1000).toString()}
                  />
                <Info
                  label="Execution Time"
                  value={(sessionLogsSummary.execution_time / 1000).toString()}
                  />
                <Info
                  label="Inside Time"
                  value={(sessionLogsSummary.in_time / 1000).toString()}
                  />
                <Info
                  label="Outside Time"
                  value={(sessionLogsSummary.out_time / 1000).toString()}
                  />
                  
                <Info
                  label="Average Cycle Time"
                  value={(sessionLogsSummary.average_cycle_time / 1000).toString()}
                />
                <Info
                  label="Average Serve Time"
                  value={(sessionLogsSummary.average_serve_time / 1000).toString()}
                />
                <Info
                  label="Average Wait Time"
                  value={(sessionLogsSummary.average_wait_time / 1000).toString()}
                />
              </div>
              <h2 className="card-title text-lg font-semibold mb-2 mt-4" >Status Stats</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <Info
                  label="Passed Requests"
                  value={sessionLogsSummary.passed_requests.toString()}
                />
                <Info
                  label="Failed Requests"
                  value={sessionLogsSummary.failed_requests.toString()}
                />
                <Info
                  label="Unknown Requests"
                  value={sessionLogsSummary.unknown_requests.toString()}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
