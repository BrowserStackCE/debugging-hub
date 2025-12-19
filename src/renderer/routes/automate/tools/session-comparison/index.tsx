import Form from "rc-field-form";
import { usePromise } from "../../../../hooks/use-promise";
import { toast } from "react-toastify";
import { useState } from "react";
import SessionDiffView from './components/SessionDiffView';
import { sanitizeCapabilities, sanitizeTextLogs } from './utils/sanitization';

const { Field } = Form;

export default function SessionComparison() {
  const [fetchSessionDetails] = usePromise(window.browserstackAPI.getAutomateSessionDetails);
  const [parseTextLogs] = usePromise(window.browserstackAPI.getAutomateParsedTextLogs);

  const [session, setSession] = useState<any>(null);
  const [textLogsResult, setTextLogsResult] = useState<any>(null);
  const [seleniumLogsA, setSeleniumLogsA] = useState<string | null>(null);
  const [loadingSeleniumA, setLoadingSeleniumA] = useState(false);

  const [session2, setSession2] = useState<any>(null);
  const [textLogsResult2, setTextLogsResult2] = useState<any>(null);
  const [seleniumLogsB, setSeleniumLogsB] = useState<string | null>(null);
  const [loadingSeleniumB, setLoadingSeleniumB] = useState(false);

  const [harLogsA, setHarLogsA] = useState<string | null>(null);
  const [harLogsB, setHarLogsB] = useState<string | null>(null);
  const [loadingHarA, setLoadingHarA] = useState(false);
  const [loadingHarB, setLoadingHarB] = useState(false);

  const loadSessionA = async (sessionId: string) => {
    try {
      const rawSessionA = await fetchSessionDetails(sessionId);
      const sessionA = sanitizeCapabilities(rawSessionA); 
      const rawLogsA = await parseTextLogs(rawSessionA);
      const logsA = sanitizeTextLogs(rawLogsA);
      setSession(sessionA);
      setTextLogsResult(logsA); 

      setLoadingSeleniumA(true);
      const selA = await window.browserstackAPI.getSeleniumLogs(rawSessionA.automation_session.selenium_logs_url); 
      setSeleniumLogsA(selA);
      setLoadingSeleniumA(false);

      setLoadingHarA(true);
      const harA = await window.browserstackAPI.getHarLogs(rawSessionA.automation_session.har_logs_url);
      setHarLogsA(harA);
      setLoadingHarA(false);
    } catch (err) {
      console.error("Error in loadSessionA:", err);
      setLoadingSeleniumA(false);
      setLoadingHarA(false);
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

      setLoadingSeleniumB(true);
      const selB = await window.browserstackAPI.getSeleniumLogs(rawSessionB.automation_session.selenium_logs_url);
      setSeleniumLogsB(selB);
      setLoadingSeleniumB(false);

      setLoadingHarB(true);
      const harB = await window.browserstackAPI.getHarLogs(rawSessionB.automation_session.har_logs_url);
      setHarLogsB(harB);
      setLoadingHarB(false);
    } catch (err) {
      console.error("Error in loadSessionB:", err);
      setLoadingSeleniumB(false);
      setLoadingHarB(false);
      throw new Error("Failed to load Session B");
    }
  };

  const OpenSession = (input: any) => {
    setSession(null);
    setTextLogsResult(null);
    setSeleniumLogsA(null);
    setSession2(null);
    setTextLogsResult2(null);
    setSeleniumLogsB(null);

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
      <h1 className="text-2xl font-bold mb-4">Session Comparison</h1>

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
          <SessionDiffView
            sessionA={session}
            sessionB={session2}
            logsA={textLogsResult}
            logsB={textLogsResult2}
            seleniumA={seleniumLogsA}
            seleniumB={seleniumLogsB}
            harA={harLogsA}
            harB={harLogsB}
            loadingA={loadingSeleniumA}
            loadingB={loadingSeleniumB}
            loadingHarA={loadingHarA}
            loadingHarB={loadingHarB}
          />
        )}
      </div>
    </div>
  );
}
