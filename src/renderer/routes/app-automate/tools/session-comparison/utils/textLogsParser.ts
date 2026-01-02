import { AppAutomateTextLogsResult } from '../types';

export const parseAppAutomateTextLogs = async (session: any): Promise<AppAutomateTextLogsResult> => {
  const response = await fetch(session.automation_session.logs);
  const logs = await response.text();
  const lines = logs.split('\n');

  const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{1,2}:\d{1,2}:\d{1,3}/;

  const entries: string[] = [];

  for (const line of lines) {
    if (timestampRegex.test(line)) {
      // New log entry → push as a new entry
      entries.push(line);
    } else if (entries.length > 0) {
      // Continuation of previous entry → append
      entries[entries.length - 1] += '\n' + line;
    } else {
      // Edge case: first line doesn't start with timestamp
      entries.push(line);
    }
  }

  // Parsing capabilities from the logs
  const capabilities: any[] = [];
  
  // Checking for capability information in the logs
  for (const entry of entries) {
    if (entry.includes('capabilities') || entry.includes('Capabilities')) {
      try {
        // Trying to extract JSON from the entry
        const jsonMatch = entry.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const caps = JSON.parse(jsonMatch[0]);
          capabilities.push(caps);
        }
      } catch (e) {
        // If parsing fails, continue
      }
    }
  }

  // If no capabilities found in logs, create a basic structure from session info
  if (capabilities.length === 0) {
    const basicCaps = {
      platformName: session.automation_session.os,
      platformVersion: session.automation_session.os_version,
      deviceName: session.automation_session.device,
      app: session.automation_session.app_details?.app_url,
      'appium:deviceName': session.automation_session.device,
      'appium:platformName': session.automation_session.os,
      'appium:platformVersion': session.automation_session.os_version,
      'appium:app': session.automation_session.app_details?.app_url,
    };
    capabilities.push(basicCaps);
  }

  return {
    capabilities,
    requests: entries,
    responses: []
  };
};
