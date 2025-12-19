const BSTACK_OPTIONS_PATH = 'bstack:options';
const ACCESSIBILITY_OPTIONS_PATH = 'accessibilityOptions';
const AUTH_TOKEN_KEY = 'authToken';
const REDACTED_VALUE = '***REDACTED***';

export function sanitizeCapabilities(session: any) {
  if (!session) {
    return session;
  }

  const sanitizedSession = JSON.parse(JSON.stringify(session));

  if (sanitizedSession[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
    sanitizedSession[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = REDACTED_VALUE;
  }
  
  const alwaysMatch = sanitizedSession.W3C_capabilities?.alwaysMatch;
  if (alwaysMatch?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
    alwaysMatch[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = REDACTED_VALUE;
  }

  const firstMatch = sanitizedSession.W3C_capabilities?.firstMatch;
  if (Array.isArray(firstMatch)) {
    firstMatch.forEach((match: any) => {
      if (match?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
        match[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = REDACTED_VALUE;
      }
    });
  }

  return sanitizedSession;
}

export function sanitizeTextLogs(textLogsResult: any) {
  if (!textLogsResult || !textLogsResult.capabilities) {
    return textLogsResult;
  }

  const sanitized = JSON.parse(JSON.stringify(textLogsResult));

  if (Array.isArray(sanitized.capabilities)) {
    sanitized.capabilities.forEach((cap: any) => {
      if (cap?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
        cap[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = REDACTED_VALUE;
      }

      const alwaysMatch = cap.W3C_capabilities?.alwaysMatch;
      if (alwaysMatch?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
        alwaysMatch[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = REDACTED_VALUE;
      }

      const firstMatch = cap.W3C_capabilities?.firstMatch;
      if (Array.isArray(firstMatch)) {
        firstMatch.forEach((match: any) => {
          if (match?.[BSTACK_OPTIONS_PATH]?.[ACCESSIBILITY_OPTIONS_PATH]?.[AUTH_TOKEN_KEY]) {
            match[BSTACK_OPTIONS_PATH][ACCESSIBILITY_OPTIONS_PATH][AUTH_TOKEN_KEY] = REDACTED_VALUE;
          }
        });
      }
    });
  }

  return sanitized;
}
