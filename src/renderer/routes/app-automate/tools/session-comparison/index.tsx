import Form from "rc-field-form";
import { usePromise } from "../../../../hooks/use-promise";
import { toast } from "react-toastify";
import { useState } from "react";
import AppAutomateSessionDiffView from './components/SessionDiffView';
import { sanitizeCapabilities, sanitizeTextLogs } from './utils/sanitization';

const { Field } = Form;

export default function AppAutomateSessionComparison() {
  const [fetchSessionDetails] = usePromise(window.browserstackAPI.getAppAutomateSessionDetails);
  const [parseTextLogs] = usePromise(window.browserstackAPI.getAppAutomateParsedTextLogs);
  const [getNetworkLogs] = usePromise(window.browserstackAPI.getAppAutomateNetworkLogs);

  const [session, setSession] = useState<any>(null);
  const [textLogsResult, setTextLogsResult] = useState<any>(null);
  const [networkA, setNetworkA] = useState<string | null>(null);
  const [loadingNetworkA, setLoadingNetworkA] = useState(false);

  const [session2, setSession2] = useState<any>(null);
  const [textLogsResult2, setTextLogsResult2] = useState<any>(null);
  const [networkB, setNetworkB] = useState<string | null>(null);
  const [loadingNetworkB, setLoadingNetworkB] = useState(false);

  const loadSessionA = async (sessionId: string) => {
    try {
      const rawSessionA = await fetchSessionDetails(sessionId);
      const sessionA = sanitizeCapabilities(rawSessionA); 
      const rawLogsA = await parseTextLogs(rawSessionA);
      const logsA = sanitizeTextLogs(rawLogsA);
      setSession(sessionA);
      setTextLogsResult(logsA);

      setLoadingNetworkA(true);
      const netA = await getNetworkLogs(rawSessionA);
      setNetworkA(netA);
      setLoadingNetworkA(false);
    } catch (err) {
      console.error("Error in loadSessionA:", err);
      setLoadingNetworkA(false);
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

      setLoadingNetworkB(true);
      const netB = await getNetworkLogs(rawSessionB);
      setNetworkB(netB);
      setLoadingNetworkB(false);
    } catch (err) {
      console.error("Error in loadSessionB:", err);
      setLoadingNetworkB(false);
      throw new Error("Failed to load Session B");
    }
  };

  const OpenSession = (input: any) => {
    setSession(null);
    setTextLogsResult(null);
    setNetworkA(null);
    setSession2(null);
    setTextLogsResult2(null);
    setNetworkB(null);

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

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-2xl font-bold mb-4">App Automate Session Comparison</h1>

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
        {session && session2 && textLogsResult && textLogsResult2 && (
          <AppAutomateSessionDiffView
            sessionA={session}
            sessionB={session2}
            logsA={textLogsResult}
            logsB={textLogsResult2}
            networkA={networkA}
            networkB={networkB}
            loadingNetworkA={loadingNetworkA}
            loadingNetworkB={loadingNetworkB}
          />
        )}
      </div>
    </div>
  );
}
