import { convertUTCToEpoch } from "./helper";

export const parseAutomateSessionLogs = (
  logString: string
): ScanResult => {
  const sessionLogLine = {
    request: { identifier: "REQUEST" },
    start: { identifier: "START_SESSION" },
    debug: { identifier: "DEBUG" },
    response: { identifier: "RESPONSE" },
    stop: { identifier: "STOP_SESSION" },
  };

  const logLines = logString.split("\n");

  let sessionStartedAt: number | null = null;
  let sessionCompletedAt: number | null = null;
  let sessionDuration: number | null = null;
  let started = false;

  const exchanges: Exchange[] = [];
  let currentExchange: Partial<Exchange> = {};
  let exchangeId = 0;
  let prevousCreated: number | null = null;

  let totalInTime = 0;
  let totalOutTime = 0;
  let statusUnknown = 0;
  let statusPassed = 0;
  let statusFailed = 0;

  logLines.forEach((logLine, index) => {
    const line = logLine.trim();
    if (!line) return;

    const splittedLine = line.split(" ");
    const lineNumber = index + 1;

    const createdAt = convertUTCToEpoch(
      `${splittedLine[0]} ${splittedLine[1]} UTC`
    );

    const type = splittedLine[2];
    const paramIndex = line.indexOf("{");

    let params: LogParams = {};

    // Safe JSON parse
    if (paramIndex > -1 && line[paramIndex - 1] !== "[") {
      try {
        params = JSON.parse(line.substring(paramIndex));
      } catch {
        params = {};
      }
    }

    sessionStartedAt = sessionStartedAt ?? createdAt;
    sessionCompletedAt = createdAt;
    sessionDuration = sessionCompletedAt - sessionStartedAt;

    switch (type) {
      // REQUEST 
      case sessionLogLine.request.identifier: {
        const request: LogRequest = {
          created_at: createdAt,
          line_number: lineNumber,
          out_time: createdAt - (prevousCreated ?? createdAt),
          http_type: splittedLine[5],
          action: splittedLine[6],
          params,
        };

        currentExchange = { ...currentExchange, request };
        totalOutTime += request.out_time;
        break;
      }

      // START_SESSION 
      case sessionLogLine.start.identifier: {
        const response: LogResponse = {
          created_at: createdAt,
          line_number: lineNumber,
          in_time: createdAt - (currentExchange.request!.created_at),
          params: { ...params, status: "Unknown" },
        };

        const exchange: Exchange = {
          id: ++exchangeId,
          ...currentExchange,
          response,
        };

        const status = response.params.status;

        if (status === undefined) statusUnknown++;
        else if (status === 0) statusPassed++;
        else statusFailed++;

        exchanges.push(exchange);
        currentExchange = {};
        break;
      }

      // DEBUG
      case sessionLogLine.debug.identifier: {
        const debug: LogDebug = {
          created_at: createdAt,
          line_number: lineNumber,
          url: splittedLine[3],
        };

        currentExchange = { ...currentExchange, debug };
        break;
      }

      // RESPONSE 
      case sessionLogLine.response.identifier: {
        prevousCreated = createdAt;

        const response: LogResponse = {
          created_at: createdAt,
          line_number: lineNumber,
          in_time: createdAt - currentExchange.request!.created_at,
          params,
        };

        const exchange: Exchange = {
          id: ++exchangeId,
          ...currentExchange,
          response,
        };

        if (started) {
          totalInTime += response.in_time;
        } else {
          started = true;
        }

        let status = response.params.status;

        if (response.params.value?.error) {
          response.params.status = "Failed";
          statusFailed++;
        } else if (typeof status === "undefined") {
          response.params.status = "Unknown";
          statusUnknown++;
        } else if (status === 0) {
          response.params.status = "Passed";
          statusPassed++;
        } else {
          response.params.status = "Unknown";
          statusUnknown++;
        }

        exchanges.push(exchange);
        currentExchange = {};
        break;
      }

      // STOP_SESSION
      case sessionLogLine.stop.identifier: {
        const request: LogRequest = {
          created_at: createdAt,
          line_number: lineNumber,
          out_time: createdAt - (prevousCreated ?? createdAt),
          http_type: "",
          action: "bs_stop",
          params: {},
        };

        const response: LogResponse = {
          created_at: createdAt,
          line_number: lineNumber,
          in_time: 0,
          params: { ...params, status: "Unknown" },
        };

        const exchange: Exchange = {
          id: ++exchangeId,
          request,
          response,
        };

        totalOutTime += request.out_time;
        statusUnknown++;

        exchanges.push(exchange);
        currentExchange = {};
        break;
      }
    }
  });

  // Final Computation

  const executionTime = totalInTime + totalOutTime;
  const setupTime = (sessionDuration ?? 0) - executionTime;

  const summary: Summary = {
    total_requests: exchanges.length,
    session_started_at: sessionStartedAt,
    session_completed_at: sessionCompletedAt,
    session_duration: sessionDuration,
    setup_time: setupTime,
    execution_time: executionTime,
    in_time: totalInTime,
    out_time: totalOutTime,
    passed_requests: statusPassed,
    failed_requests: statusFailed,
    unknown_requests: statusUnknown,
    log_length: logLines.length,
    setup_time_perc: (setupTime * 100) / (sessionDuration ?? 1),
    in_time_perc: (totalInTime * 100) / (sessionDuration ?? 1),
    out_time_perc: (totalOutTime * 100) / (sessionDuration ?? 1),
    average_cycle_time: executionTime / exchanges.length,
    average_serve_time: totalInTime / exchanges.length,
    average_wait_time: totalOutTime / exchanges.length,
    passed_perc: (statusPassed * 100) / exchanges.length,
    failed_perc: (statusFailed * 100) / exchanges.length,
    unknown_perc: (statusUnknown * 100) / exchanges.length,
  };

  return { summary, exchanges };
};