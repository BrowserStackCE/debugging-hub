import { convertUTCToEpoch, nullCheck } from "./helper";

export const parseAutomateSeleniumLogs = (
  logString: string,
  date: string,
  sessionCreatedAtUTC: number
): SeleniumScanResult => {
  const seleniumLogLine: SeleniumLogLineType[] = [
    {
      name: "start_session",
      identifier: "/session: Executing POST on /session ",
      phase: "Setup",
    },
    {
      name: "polling",
      identifier: "Polling http://localhost",
    },
    {
      name: "dialect",
      identifier: "Detected dialect",
    },
    {
      name: "start_driver",
      identifier: "Started new session",
      phase: "Session",
    },
    {
      name: "request",
      identifier: "Found handler",
    },
    {
      name: "request_handler",
      identifier: "Handler thread for session",
    },
    {
      name: "upstream",
      identifier: "To upstream",
    },
    {
      name: "http_request",
      identifier: "writeRequests",
    },
    {
      name: "http_response",
      identifier: "getInputStream0",
    },
    {
      name: "downstream",
      identifier: "To downstream",
    },
    {
      name: "stop_session",
      identifier: "Removing session",
      phase: "Tear Down",
    },
  ];

  const dataCenters: Record<
    string,
    {
      time_zone: string;
    }
  > = {
    time_zone_1: { time_zone: "-08:00" },
    time_zone_2: { time_zone: "-07:00" },
    time_zone_3: { time_zone: "-05:00" },
    time_zone_4: { time_zone: "-04:00" },
    time_zone_5: { time_zone: "+01:00" },
    time_zone_6: { time_zone: "+02:00" },
    time_zone_7: { time_zone: "+05:30" },
    time_zone_8: { time_zone: "+10:00" },
  };

  const logLines = logString.split("\n");

  let phase: Phase = null;
  let sessionStartedAt: number | null = null;
  let setupPollCount = 0;
  let dialect = "Unkown";
  let driverStartedAt: number | null = null;
  let currentExchange: Partial<SeleniumExchange> & {
    request?: LogRequest;
    response?: LogResponse;
  } = {};
  let exchangeId = 0;
  let prevousCreated: number | null = null;
  let totalOutTime = 0;
  let totalInTime = 0;
  let statusUnknown = 0;
  let statusPassed = 0;
  let statusFailed = 0;
  const exchanges: SeleniumExchange[] = [];
  let tearDownPollCount = 0;
  let sessionCompletedAt: number | null = null;
  let sessionDuration: number | null = null;
  let row = 1;

  // Find first non-empty line to derive time
  let firstLine: string | null = null;
  for (let i = 0; i < logLines.length && !firstLine; ++i) {
    const trimmed = logLines[i].trim();
    if (trimmed) firstLine = trimmed;
  }

  let min = Number.MAX_SAFE_INTEGER;
  let currentTimeZone: { time_zone: string } = { time_zone: "+00:00" };

  if (firstLine) {
    Object.keys(dataCenters).forEach((timeZone) => {
      const tz = dataCenters[timeZone].time_zone;
      const timePart = firstLine!.split(" ")[0];
      const convertedEpoch = convertUTCToEpoch(`${date}T${timePart}${tz}`);
      const diff = Math.abs(sessionCreatedAtUTC - convertedEpoch);
      if (diff < min) {
        min = diff;
        currentTimeZone = dataCenters[timeZone];
      }
    });
  }

  logLines.forEach((logLine, index) => {
    const line = logLine.trim();
    if (!line) return;

    const split = line.split(" ");
    const timeStr = split[0];

    const createdAtUTC = convertUTCToEpoch(
      `${date}T${timeStr}${currentTimeZone["time_zone"]}`
    );

    if (isNaN(createdAtUTC)) return;

    let type: SeleniumLogLineType | undefined;

    seleniumLogLine.forEach((lineType) => {
      if (line.includes(lineType.identifier)) {
        type = lineType;
        phase = lineType.phase ?? phase;
      }
    });

    sessionCompletedAt = createdAtUTC;
    if (sessionStartedAt !== null) {
      sessionDuration = sessionCompletedAt - sessionStartedAt;
    }

    if (!type) {
      console.log(`Line skipped: ${line}`);
      return;
    }

    const phaseEvent = `${phase}-${type.name}-${row}`;
    const lineNumber = index + 1;

    switch (phaseEvent) {
      // Setup
      case `Setup-${seleniumLogLine[0].name}-1`: {
        sessionStartedAt = createdAtUTC;
        break;
      }
      case `Setup-${seleniumLogLine[1].name}-1`: {
        setupPollCount++;
        break;
      }
      case `Setup-${seleniumLogLine[2].name}-1`: {
        const parts = line.split("Detected dialect:");
        if (parts[1]) {
          dialect = parts[1].trim();
        }
        break;
      }

      // Session: started driver
      case `Session-${seleniumLogLine[3].name}-1`: {
        driverStartedAt = createdAtUTC;
        break;
      }

      // Session: Found handler (request start)
      case `Session-${seleniumLogLine[4].name}-1`: {
        const request: LogRequest = {
            created_at: createdAtUTC,
            line_number: lineNumber,
            out_time: createdAtUTC - (prevousCreated ?? createdAtUTC),
            http_type: "",
            action: ""
        };

        currentExchange = {
          id: ++exchangeId,
          request,
        };

        totalOutTime += request.out_time;
        row = 2;
        break;
      }

      // Session: To upstream (request params)
      case `Session-${seleniumLogLine[6].name}-2`: {
        let params: any = {};
        try {
          params = JSON.parse(line.split("To upstream:")[1]);
        } catch {
          params = { message: line.split("To upstream:")[1] };
        }

        currentExchange = {
          ...currentExchange,
          request: {
            ...(currentExchange.request as LogRequest),
            params,
          },
        };
        row = 3;
        break;
      }

      // Session: HTTP request headers
      case `Session-${seleniumLogLine[7].name}-3`: {
        const headersStr = line.split("pairs:")[1];
        if (headersStr) {
          const headers = JSON.parse(
            headersStr
              .replace(/}{/g, '","')
              .replace(/: /g, '": "')
              .replace(/{/g, '{"')
              .replace(/}/g, '"}')
          ) as LogHeaders;

          currentExchange = {
            ...currentExchange,
            request: {
              ...(currentExchange.request as LogRequest),
              headers,
            },
          };
        }
        row = 4;
        break;
      }

      // Session: HTTP response headers
      case `Session-${seleniumLogLine[8].name}-4`: {
        const headersStr = line.split("pairs:")[1];
        let headers: LogHeaders = {};
        if (headersStr) {
          headers = JSON.parse(
            headersStr
              .replace(/}{/g, '","')
              .replace(/: /g, '": "')
              .replace(/{/g, '{"')
              .replace(/}/g, '"}')
          );
        }

        currentExchange = {
          ...currentExchange,
          response: {
            ...(currentExchange.response || {}),
            headers,
          },
        };
        row = 5;
        break;
      }

      // Session: To downstream (response body)
      case `Session-${seleniumLogLine[9].name}-5`: {
        prevousCreated = createdAtUTC;

        let parsedParams: any = {};
        const downstreamPart = line.split("To downstream:")[1];

        if (downstreamPart) {
          try {
            parsedParams = JSON.parse(downstreamPart);
          } catch {
            parsedParams = { message: downstreamPart };
          }
        }

        const request = currentExchange.request as LogRequest;

        const response: LogResponse = {
          ...(currentExchange.response || {}),
          created_at: createdAtUTC,
          line_number: lineNumber,
          in_time: createdAtUTC - request.created_at,
          params: parsedParams,
        };

        currentExchange = {
          ...currentExchange,
          response,
        };

        totalInTime += response.in_time ?? 0;

        const headers = response.headers || {};
        const nullHeader = headers["null"];

        if (typeof nullHeader === "undefined") {
          statusUnknown++;
        } else if (nullHeader.includes("200 OK")) {
          statusPassed++;
        } else {
          statusFailed++;
        }

        exchanges.push(currentExchange as SeleniumExchange);
        currentExchange = {};
        row = 1;
        break;
      }

      // Tear Down: Removing session (request start)
      case `Tear Down-${seleniumLogLine[10].name}-1`: {
        const request: LogRequest = {
            created_at: createdAtUTC,
            line_number: lineNumber,
            out_time: createdAtUTC - (prevousCreated ?? createdAtUTC),
            http_type: "",
            action: ""
        };

        currentExchange = {
          id: ++exchangeId,
          request,
        };

        totalOutTime += request.out_time;
        row = 2;
        break;
      }

      // Tear Down: HTTP request headers
      case `Tear Down-${seleniumLogLine[7].name}-2`: {
        const headersStr = line.split("pairs:")[1];
        if (headersStr) {
          const headers = JSON.parse(
            headersStr
              .replace(/}{/g, '","')
              .replace(/: /g, '": "')
              .replace(/{/g, '{"')
              .replace(/}/g, '"}')
          ) as LogHeaders;

          currentExchange = {
            ...currentExchange,
            request: {
              ...(currentExchange.request as LogRequest),
              headers,
            },
          };
        }
        row = 3;
        break;
      }

      // Tear Down: HTTP response headers
      case `Tear Down-${seleniumLogLine[8].name}-3`: {
        const headersStr = line.split("pairs:")[1];
        if (headersStr) {
          const headers = JSON.parse(
            headersStr
              .replace(/}{/g, '","')
              .replace(/: /g, '": "')
              .replace(/{/g, '{"')
              .replace(/}/g, '"}')
          ) as LogHeaders;

          currentExchange = {
            ...currentExchange,
            response: {
              ...(currentExchange.response || {}),
              headers,
            },
          };
        }
        row = 4;
        break;
      }

      // Tear Down: To downstream (response body)
      case `Tear Down-${seleniumLogLine[9].name}-4`: {
        prevousCreated = createdAtUTC;

        let params: any = {};
        const downstreamPart = line.split("To downstream:")[1];
        if (downstreamPart) {
          try {
            params = JSON.parse(downstreamPart);
          } catch {
            params = { message: downstreamPart };
          }
        }

        const request = currentExchange.request as LogRequest;

        const response: LogResponse = {
          ...(currentExchange.response || {}),
          created_at: createdAtUTC,
          line_number: lineNumber,
          in_time: createdAtUTC - request.created_at,
          params,
        };

        currentExchange = {
          ...currentExchange,
          response,
        };

        totalInTime += response.in_time ?? 0;

        const headers = response.headers || {};
        const nullHeader = headers["null"];

        if (typeof nullHeader === "undefined") {
          statusUnknown++;
        } else if (nullHeader.includes("200 OK")) {
          statusPassed++;
        } else {
          statusFailed++;
        }

        exchanges.push(currentExchange as SeleniumExchange);
        currentExchange = {};
        row = 5;
        break;
      }

      // Tear Down: polling
      case `Tear Down-${seleniumLogLine[1].name}-5`: {
        tearDownPollCount++;
        row = 1;
        break;
      }

      default: {
        console.log(`Line skipped: ${line}`);
        break;
      }
    }
  });

  const driverInitTime =
    driverStartedAt !== null && sessionStartedAt !== null
      ? driverStartedAt - sessionStartedAt
      : null;

  const executionTime = totalInTime + totalOutTime;
  const setupTime =
    sessionDuration !== null ? sessionDuration - executionTime : null;

  const summary: SeleniumSummary = {
    total_requests: exchanges.length,
    dialect,
    setup_polls: setupPollCount,
    tear_down_polls: tearDownPollCount,
    session_started_at: nullCheck(sessionStartedAt),
    session_completed_at: nullCheck(sessionCompletedAt),
    driver_started_at: nullCheck(driverStartedAt),
    driver_init_time: nullCheck(driverInitTime),
    session_duration: sessionDuration,
    setup_time: nullCheck(setupTime),
    execution_time: nullCheck(executionTime),
    in_time: totalInTime || -1,
    out_time: totalOutTime || -1,
    passed_requests: statusPassed,
    failed_requests: statusFailed,
    unknown_requests: statusUnknown,
    log_length: logLines.length,
    setup_time_perc: nullCheck(
      sessionDuration ? (setupTime! * 100) / sessionDuration : null
    ),
    in_time_perc: nullCheck(
      sessionDuration ? (totalInTime * 100) / sessionDuration : null
    ),
    out_time_perc: nullCheck(
      sessionDuration ? (totalOutTime * 100) / sessionDuration : null
    ),
    average_cycle_time: nullCheck(
      exchanges.length ? executionTime / exchanges.length : null
    ),
    average_serve_time: nullCheck(
      exchanges.length ? totalInTime / exchanges.length : null
    ),
    average_wait_time: nullCheck(
      exchanges.length ? totalOutTime / exchanges.length : null
    ),
    passed_perc: nullCheck(
      exchanges.length ? (statusPassed * 100) / exchanges.length : null
    ),
    failed_perc: nullCheck(
      exchanges.length ? (statusFailed * 100) / exchanges.length : null
    ),
    unknown_perc: nullCheck(
      exchanges.length ? (statusUnknown * 100) / exchanges.length : null
    ),
  };

  return { summary, exchanges };
};
