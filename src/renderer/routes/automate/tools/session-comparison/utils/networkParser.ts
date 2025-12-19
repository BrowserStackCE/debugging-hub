import { NetworkComparison, NetworkEntry } from '../types';

export function parseHarLogs(harData: string | null): Record<string, any[]> | null {
  if (!harData) return null;
  try {
    const har = JSON.parse(harData);
    if (!har?.log?.entries?.length) return null;
    const groupedEntries: Record<string, any[]> = {};
    har.log.entries.forEach((entry: any) => {
      const key = `${entry.request.method}|||${entry.request.url}`;
      if (!groupedEntries[key]) groupedEntries[key] = [];
      groupedEntries[key].push(entry);
    });
    return groupedEntries;
  } catch (e) {
    console.error('Error parsing HAR data:', e);
    return null;
  }
}

export function formatNetworkEntry(key: string, entries: any[]): string {
  const [method, url] = key.split('|||');
  const firstEntry = entries[0];
  const response = firstEntry.response;
  const timings = firstEntry.timings || {};
  const statusCodes = entries.map((e: any) => e.response.status);
  const uniqueStatuses = [...new Set(statusCodes)];
  const avgTime = entries.reduce((sum, e) => sum + (e.time || 0), 0) / entries.length;
  const minTime = Math.min(...entries.map((e: any) => e.time || 0));
  const maxTime = Math.max(...entries.map((e: any) => e.time || 0));
  
  return `Count: ${entries.length} | Status: ${uniqueStatuses.join(', ')}
Time: ${avgTime.toFixed(1)}ms (${minTime}-${maxTime}ms)
Size: ${response.bodySize || 0}b | Type: ${response.content?.mimeType || 'unknown'}
Timings: ${Object.entries(timings)
  .filter(([_, v]) => v !== -1)
  .map(([k, v]) => `${k}:${v}ms`)
  .join(' ')}`;
}

export function compareNetworkLogs(harA: string | null, harB: string | null): NetworkComparison {
  const harLogsA = parseHarLogs(harA);
  const harLogsB = parseHarLogs(harB);
  if (!harLogsA && !harLogsB) return { matched: [], onlyInA: [], onlyInB: [] };
  
  const matched: Array<{ key: string; dataA: any[]; dataB: any[] }> = [];
  const onlyInA: Array<{ key: string; data: any[] }> = [];
  const onlyInB: Array<{ key: string; data: any[] }> = [];
  const keysA = new Set(Object.keys(harLogsA || {}));
  const keysB = new Set(Object.keys(harLogsB || {}));
  
  keysA.forEach(key => {
    if (keysB.has(key)) matched.push({ key, dataA: harLogsA![key], dataB: harLogsB![key] });
    else onlyInA.push({ key, data: harLogsA![key] });
  });
  keysB.forEach(key => {
    if (!keysA.has(key)) onlyInB.push({ key, data: harLogsB![key] });
  });
  
  return { matched, onlyInA, onlyInB };
}
