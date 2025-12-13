import { useState, useMemo } from 'react';
import ReactDiffViewer from 'react-diff-viewer';

function createInfoString(session: any) {
  if (!session?.automation_session) return "No Session Data";

  const s = session.automation_session;
  return `Project: ${s.project_name}
Build: ${s.build_name}
Status: ${s.status}
OS: ${s.os} ${s.os_version}
Browser: ${s.browser} ${s.browser_version}
Device: ${s.device || "N/A"}
Duration: ${s.duration}s
Created At: ${new Date(s.created_at).toLocaleString()}`.trim();
}

interface SessionDiffViewProps {
  sessionA: any;
  sessionB: any;
  logsA: any;
  logsB: any;
  seleniumA: string | null;
  seleniumB: string | null;
  harA: string | null;
  harB: string | null;
  loadingA: boolean;
  loadingB: boolean;
  loadingHarA: boolean;
  loadingHarB: boolean;
}

export function SessionDiffView({
  sessionA,
  sessionB,
  logsA,
  logsB,
  seleniumA,
  seleniumB,
  harA,
  harB,
  loadingA,
  loadingB,
  loadingHarA,
  loadingHarB
}: SessionDiffViewProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'capabilities' | 'selenium' | 'network'>('info');

  const parseHarLogs = useMemo(() => (harData: string | null) => {
    if (!harData) return null;

    try {
      const har = JSON.parse(harData);
      if (!har?.log?.entries?.length) return null;

      const groupedEntries: Record<string, any[]> = {};
      har.log.entries.forEach((entry: any) => {
        const key = `${entry.request.method}|||${entry.request.url}`;
        if (!groupedEntries[key]) {
          groupedEntries[key] = [];
        }
        groupedEntries[key].push(entry);
      });

      return groupedEntries;
    } catch (e) {
      console.error('Error parsing HAR data:', e);
      return null;
    }
  }, []);

  const formatNetworkEntry = (key: string, entries: any[]): string => {
    const [method, url] = key.split('|||');
    const firstEntry = entries[0];
    const response = firstEntry.response;
    const timings = firstEntry.timings || {};

    const statusCodes = entries.map((e: any) => e.response.status);
    const uniqueStatuses = [...new Set(statusCodes)];
    const avgTime = entries.reduce((sum, e) => sum + (e.time || 0), 0) / entries.length;
    const minTime = Math.min(...entries.map((e: any) => e.time || 0));
    const maxTime = Math.max(...entries.map((e: any) => e.time || 0));

    const urlObj = new URL(url);
    const shortUrl = urlObj.pathname + urlObj.search;

    return `Count: ${entries.length} | Status: ${uniqueStatuses.join(', ')}
Time: ${avgTime.toFixed(1)}ms (${minTime}-${maxTime}ms)
Size: ${response.bodySize || 0}b | Type: ${response.content?.mimeType || 'unknown'}
Timings: ${Object.entries(timings)
  .filter(([_, v]) => v !== -1)
  .map(([k, v]) => `${k}:${v}ms`)
  .join(' ')}`;
  };

  const networkComparison = useMemo(() => {
    const harLogsA = parseHarLogs(harA);
    const harLogsB = parseHarLogs(harB);

    if (!harLogsA && !harLogsB) {
      return { matched: [], onlyInA: [], onlyInB: [] };
    }

    const matched: Array<{ key: string; dataA: any[]; dataB: any[] }> = [];
    const onlyInA: Array<{ key: string; data: any[] }> = [];
    const onlyInB: Array<{ key: string; data: any[] }> = [];

    const keysA = new Set(Object.keys(harLogsA || {}));
    const keysB = new Set(Object.keys(harLogsB || {}));

    keysA.forEach(key => {
      if (keysB.has(key)) {
        matched.push({
          key,
          dataA: harLogsA![key],
          dataB: harLogsB![key]
        });
      } else {
        onlyInA.push({
          key,
          data: harLogsA![key]
        });
      }
    });

    keysB.forEach(key => {
      if (!keysA.has(key)) {
        onlyInB.push({
          key,
          data: harLogsB![key]
        });
      }
    });

    return { matched, onlyInA, onlyInB };
  }, [harA, harB, parseHarLogs]);

  const infoStrA = createInfoString(sessionA);
  const infoStrB = createInfoString(sessionB);
  const nameA = sessionA?.automation_session?.name || "Unnamed Session A";
  const nameB = sessionB?.automation_session?.name || "Unnamed Session B";

  const capsStrA = JSON.stringify(logsA.capabilities[0], null, 2);
  const capsStrB = JSON.stringify(logsB.capabilities[0], null, 2);

  const selLogsA = loadingA ? "Loading logs for A..." : (seleniumA || "No Selenium logs available");
  const selLogsB = loadingB ? "Loading logs for B..." : (seleniumB || "No Selenium logs available");

  const tabs = [
    { id: 'info', label: 'Session Info' },
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'selenium', label: 'Selenium Logs' },
    { id: 'network', label: 'Network Logs' }
  ] as const;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <div className="flex border-b bg-gray-50 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'info' && (
          <ReactDiffViewer
            oldValue={infoStrA}
            newValue={infoStrB}
            splitView={true}
            leftTitle={nameA}
            rightTitle={nameB}
            useDarkTheme={false}
          />
        )}

        {activeTab === 'capabilities' && (
          <ReactDiffViewer
            oldValue={capsStrA}
            newValue={capsStrB}
            splitView={true}
            leftTitle={nameA}
            rightTitle={nameB}
            useDarkTheme={false}
          />
        )}

        {activeTab === 'selenium' && (
          <ReactDiffViewer
            oldValue={selLogsA}
            newValue={selLogsB}
            splitView={true}
            leftTitle={nameA}
            rightTitle={nameB}
            useDarkTheme={false}
          />
        )}

        {activeTab === 'network' && (
          <div className="p-6 space-y-6">
            {loadingHarA || loadingHarB ? (
              <div className="text-center py-8 text-gray-500">
                Loading network logs...
              </div>
            ) : (
              <>
                {networkComparison.matched.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      Matched Requests ({networkComparison.matched.length})
                    </h3>
                    {networkComparison.matched.map((item, idx) => {
                      const [method, url] = item.key.split('|||');
                      const urlObj = new URL(url);
                      const shortUrl = urlObj.pathname + urlObj.search;

                      return (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-3 py-2 font-medium text-xs text-gray-700 break-all">
                            <span className="font-bold">{method}</span> {shortUrl}
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 text-xs">
                            <div>
                              <div className="font-semibold mb-1">{nameA}</div>
                              <pre className="whitespace-pre-wrap break-words bg-white p-2 rounded border">
                                {formatNetworkEntry(item.key, item.dataA)}
                              </pre>
                            </div>
                            <div>
                              <div className="font-semibold mb-1">{nameB}</div>
                              <pre className="whitespace-pre-wrap break-words bg-white p-2 rounded border">
                                {formatNetworkEntry(item.key, item.dataB)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {networkComparison.onlyInA.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-red-700 border-b pb-2">
                      Only in {nameA} ({networkComparison.onlyInA.length})
                    </h3>
                    {networkComparison.onlyInA.map((item, idx) => {
                      const [method, url] = item.key.split('|||');
                      const urlObj = new URL(url);
                      const shortUrl = urlObj.pathname + urlObj.search;

                      return (
                        <div key={idx} className="border border-red-200 rounded-lg overflow-hidden bg-red-50">
                          <div className="bg-red-100 px-3 py-2 font-medium text-xs text-red-800 break-all">
                            <span className="font-bold">{method}</span> {shortUrl}
                          </div>
                          <pre className="p-3 text-xs whitespace-pre-wrap break-words">
                            {formatNetworkEntry(item.key, item.data)}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                )}

                {networkComparison.onlyInB.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-green-700 border-b pb-2">
                      Only in {nameB} ({networkComparison.onlyInB.length})
                    </h3>
                    {networkComparison.onlyInB.map((item, idx) => {
                      const [method, url] = item.key.split('|||');
                      const urlObj = new URL(url);
                      const shortUrl = urlObj.pathname + urlObj.search;

                      return (
                        <div key={idx} className="border border-green-200 rounded-lg overflow-hidden bg-green-50">
                          <div className="bg-green-100 px-3 py-2 font-medium text-xs text-green-800 break-all">
                            <span className="font-bold">{method}</span> {shortUrl}
                          </div>
                          <pre className="p-3 text-xs whitespace-pre-wrap break-words">
                            {formatNetworkEntry(item.key, item.data)}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                )}

                {networkComparison.matched.length === 0 &&
                 networkComparison.onlyInA.length === 0 &&
                 networkComparison.onlyInB.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No network logs available for either session
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
