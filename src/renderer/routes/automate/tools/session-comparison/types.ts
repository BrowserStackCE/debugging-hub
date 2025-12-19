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

export interface SessionData {
  automation_session: {
    name?: string;
    project_name: string;
    build_name: string;
    status: string;
    os: string;
    os_version: string;
    browser: string;
    browser_version: string;
    device?: string;
    duration: number;
    created_at: string;
    selenium_logs_url: string;
    har_logs_url: string;
  };
  [key: string]: any;
}

export interface TextLogsResult {
  capabilities: any[];
  [key: string]: any;
}

export interface NetworkEntry {
  request: {
    method: string;
    url: string;
  };
  response: {
    status: number;
    bodySize?: number;
    content?: {
      mimeType?: string;
    };
  };
  time?: number;
  timings?: Record<string, number>;
}

export interface HarLog {
  log: {
    entries: NetworkEntry[];
  };
}

export interface NetworkComparison {
  matched: Array<{ key: string; dataA: any[]; dataB: any[] }>;
  onlyInA: Array<{ key: string; data: any[] }>;
  onlyInB: Array<{ key: string; data: any[] }>;
}
