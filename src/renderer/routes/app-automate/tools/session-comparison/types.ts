export interface CharDiff {
  type: 'common' | 'removed' | 'added';
  text: string;
}

export interface DiffLine {
  type: 'unchanged' | 'removed' | 'added' | 'modified';
  leftLine: string | null;
  rightLine: string | null;
  leftNumber: number | null;
  rightNumber: number | null;
  charDiffs?: CharDiff[];
}

export interface AppAutomateSessionData {
  automation_session: {
    name?: string;
    project_name: string;
    build_name: string;
    status: string;
    os: string;
    os_version: string;
    browser: string | null;
    browser_version: string;
    device: string;
    duration: number;
    reason: string;
    app_details: {
      app_url: string;
      app_name: string;
      app_version: string;
      app_custom_id?: string;
      uploaded_at: string;
    };
  };
  [key: string]: any;
}

export interface AppAutomateTextLogsResult {
  capabilities: any[];
  [key: string]: any;
}

export interface AppAutomateNetworkEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    cookies: any[];
    headers: Array<{
      name: string;
      value: string;
    }>;
    queryString: any[];
    postData?: {
      mimeType: string;
      text: string;
    };
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: any[];
    headers: Array<{
      name: string;
      value: string;
    }>;
    content: {
      size: number;
      mimeType: string;
      text?: string;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: {};
  timings: {
    send: number;
    wait: number;
    receive: number;
  };
}

export interface AppAutomateHarLog {
  log: {
    version: string;
    creator: {
      name: string;
      version: string;
      comment?: string;
    };
    entries: AppAutomateNetworkEntry[];
  };
}

export interface AppAutomateNetworkComparison {
  matched: Array<{ key: string; dataA: AppAutomateNetworkEntry[]; dataB: AppAutomateNetworkEntry[] }>;
  onlyInA: Array<{ key: string; data: AppAutomateNetworkEntry[] }>;
  onlyInB: Array<{ key: string; data: AppAutomateNetworkEntry[] }>;
}
