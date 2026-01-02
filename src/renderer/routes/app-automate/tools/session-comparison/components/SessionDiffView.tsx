import { useState, useMemo } from 'react';
import DiffViewer from './DiffViewer';
import { AppAutomateSessionData, AppAutomateTextLogsResult } from '../types';
import { compareAppAutomateNetworkLogs, formatAppAutomateNetworkEntry } from '../utils/networkParser';

interface AppAutomateSessionDiffViewProps {
  sessionA: AppAutomateSessionData;
  sessionB: AppAutomateSessionData;
  logsA: AppAutomateTextLogsResult;
  logsB: AppAutomateTextLogsResult;
  networkA: string | null;
  networkB: string | null;
  loadingNetworkA: boolean;
  loadingNetworkB: boolean;
}

function createAppAutomateInfoString(session: AppAutomateSessionData) {
  if (!session?.automation_session) return "No Session Data";
  const s = session.automation_session;
  return `Project: ${s.project_name}
Build: ${s.build_name}
Status: ${s.status}
OS: ${s.os} ${s.os_version}
Device: ${s.device || "N/A"}
Duration: ${s.duration}s
Reason: ${s.reason}
App: ${s.app_details?.app_name || "N/A"} (${s.app_details?.app_version || "N/A"})
App Custom ID: ${s.app_details?.app_custom_id || "N/A"}`.trim();
}

export default function AppAutomateSessionDiffView({
  sessionA,
  sessionB,
  logsA,
  logsB,
  networkA,
  networkB,
  loadingNetworkA,
  loadingNetworkB
}: AppAutomateSessionDiffViewProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'capabilities' | 'network'>('info');

  const networkComparison = useMemo(() => {
    return compareAppAutomateNetworkLogs(networkA || '', networkB || '');
  }, [networkA, networkB]);

  const infoStrA = createAppAutomateInfoString(sessionA);
  const infoStrB = createAppAutomateInfoString(sessionB);
  const nameA = sessionA?.automation_session?.name || "Unnamed Session A";
  const nameB = sessionB?.automation_session?.name || "Unnamed Session B";
  const capsStrA = JSON.stringify(logsA?.capabilities?.[0] || {}, null, 2);
  const capsStrB = JSON.stringify(logsB?.capabilities?.[0] || {}, null, 2);

  const tabs = [
    { id: 'info', label: 'Session Info' },
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'network', label: 'Network Logs' }
  ] as const;

  const handleTabChange = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" 
      style={{ height: 'calc(100vh - 120px)' }}
    >
      <div className="flex border-b bg-gray-50 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
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
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'info' && (
          <DiffViewer
            oldValue={infoStrA}
            newValue={infoStrB}
            leftTitle={nameA}
            rightTitle={nameB}
            batchSize={100}
          />
        )}
        {activeTab === 'capabilities' && (
          <DiffViewer
            oldValue={capsStrA}
            newValue={capsStrB}
            leftTitle={nameA}
            rightTitle={nameB}
            batchSize={100}
          />
        )}
        {activeTab === 'network' && (
          <div className="p-6 space-y-6 overflow-auto h-full w-full">
            {loadingNetworkA || loadingNetworkB ? (
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
                      const shortUrl = urlObj.origin + urlObj.pathname + urlObj.search;
                      return (
                        <div key={idx} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-3 py-2 font-medium text-xs text-gray-700 break-all">
                            <span className="font-bold">{method}</span> {shortUrl}
                          </div>
                          <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 text-xs">
                            <div>
                              <div className="font-semibold mb-1">{nameA}</div>
                              <pre className="whitespace-pre-wrap break-words bg-white p-2 rounded border">
                                {formatAppAutomateNetworkEntry(item.key, item.dataA)}
                              </pre>
                            </div>
                            <div>
                              <div className="font-semibold mb-1">{nameB}</div>
                              <pre className="whitespace-pre-wrap break-words bg-white p-2 rounded border">
                                {formatAppAutomateNetworkEntry(item.key, item.dataB)}
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
                            {formatAppAutomateNetworkEntry(item.key, item.data)}
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
                            {formatAppAutomateNetworkEntry(item.key, item.data)}
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
