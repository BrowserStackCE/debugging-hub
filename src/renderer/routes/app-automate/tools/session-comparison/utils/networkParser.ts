import { AppAutomateHarLog, AppAutomateNetworkEntry, AppAutomateNetworkComparison } from '../types';

export function parseAppAutomateHarLogs(harLogsText: string): AppAutomateHarLog | null {
  try {
    return JSON.parse(harLogsText) as AppAutomateHarLog;
  } catch (error) {
    console.error('Failed to parse App Automate HAR logs:', error);
    return null;
  }
}

export function compareAppAutomateNetworkLogs(harLogsA: string, harLogsB: string): AppAutomateNetworkComparison {
  const harA = parseAppAutomateHarLogs(harLogsA);
  const harB = parseAppAutomateHarLogs(harLogsB);

  if (!harA || !harB) {
    return {
      matched: [],
      onlyInA: [],
      onlyInB: []
    };
  }

  const entriesA = harA.log.entries || [];
  const entriesB = harB.log.entries || [];

  // Creating a map of method+url to entries for comparison
  const mapA = new Map<string, AppAutomateNetworkEntry[]>();
  const mapB = new Map<string, AppAutomateNetworkEntry[]>();

  // Groupong entries by method+url
  entriesA.forEach(entry => {
    const key = `${entry.request.method}|||${entry.request.url}`;
    if (!mapA.has(key)) {
      mapA.set(key, []);
    }
    mapA.get(key)!.push(entry);
  });

  entriesB.forEach(entry => {
    const key = `${entry.request.method}|||${entry.request.url}`;
    if (!mapB.has(key)) {
      mapB.set(key, []);
    }
    mapB.get(key)!.push(entry);
  });

  const matched: Array<{ key: string; dataA: AppAutomateNetworkEntry[]; dataB: AppAutomateNetworkEntry[] }> = [];
  const onlyInA: Array<{ key: string; data: AppAutomateNetworkEntry[] }> = [];
  const onlyInB: Array<{ key: string; data: AppAutomateNetworkEntry[] }> = [];

  // Finding matched entries
  for (const [key, dataA] of mapA) {
    if (mapB.has(key)) {
      matched.push({ key, dataA, dataB: mapB.get(key)! });
    } else {
      onlyInA.push({ key, data: dataA });
    }
  }

  // Finding entries only in B
  for (const [key, dataB] of mapB) {
    if (!mapA.has(key)) {
      onlyInB.push({ key, data: dataB });
    }
  }

  return {
    matched,
    onlyInA,
    onlyInB
  };
}

export function formatAppAutomateNetworkEntry(key: string, entries: AppAutomateNetworkEntry[]): string {
  const [method, url] = key.split('|||');
  let result = `${method} ${url}\n`;

  entries.forEach((entry, index) => {
    result += `--- Request ${index + 1} ---\n`;
    result += `Status: ${entry.response.status} ${entry.response.statusText}\n`;
    result += `Time: ${entry.time}ms\n`;
    result += `Started: ${entry.startedDateTime}\n`;
    
    const keyHeaders = ['content-type', 'user-agent', 'accept', 'authorization'];
    const requestHeaders = entry.request.headers
      .filter(h => keyHeaders.includes(h.name.toLowerCase()))
      .map(h => `${h.name}: ${h.value}`)
      .join('\n');
    
    if (requestHeaders) {
      result += `Request Headers:\n${requestHeaders}\n`;
    }

    const responseHeaders = entry.response.headers
      .filter(h => keyHeaders.includes(h.name.toLowerCase()))
      .map(h => `${h.name}: ${h.value}`)
      .join('\n');
    
    if (responseHeaders) {
      result += `Response Headers:\n${responseHeaders}\n`;
    }

    if (entry.request.postData) {
      result += `Request Body: ${entry.request.postData.text}\n`;
    }

    result += '\n';
  });

  return result.trim();
}
