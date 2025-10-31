

const buildCapabilities = (line: string[], isAppAutomate: boolean) => {
    let caps = JSON.parse(line[1]);
    return (isAppAutomate ? caps : caps.desiredCapabilities);
};

export const parseAutomateTextLogs = (lines: string[]): ParsedTextLogsResult => {
    const capabilities: string[] = [];
    const requests: (ParsedTextLogsRequest | string)[] = [];
    const responses: unknown[] = [];
    let timeLastResponse: number | undefined;

    lines.forEach((line, i) => {
        if ([1, 2, 3].includes(i)) return;

        if (i === 0) {
            capabilities.push(buildCapabilities(line.split("/session"),false));
            return;
        }

        const parts = line.split(" ");
        const requestType = parts[2];

        if (requestType === "REQUEST") {
            if (timeLastResponse !== undefined) {
                const timeRequest = Date.parse(`${parts[0]} ${parts[1]}`);
                const sleepTime = Math.floor((timeRequest - timeLastResponse) / 1000);
                if (sleepTime > 0) requests.push(`SLEEP ${sleepTime}`);
            }

            const method = parts[5];
            const endpoint = "/" + parts[6].split("/").slice(3).join("/");

            let data: Record<string, unknown> | string = {};
            try {
                const parsed = JSON.parse(parts.slice(7).join(" "));
                data = parsed || {};
            } catch (err: any) {
                console.log(err.message);
                data = {};
            }

            requests.push({ method, endpoint, data });
        } else if (requestType === "RESPONSE") {
            try {
                const json = JSON.parse(parts.slice(3).join(" "));
                responses.push(json.value);
            } catch {
                responses.push("");
            }
            timeLastResponse = Date.parse(`${parts[0]} ${parts[1]}`);
        }
    });

    return { capabilities, requests, responses };
};

export const parseAppAutomateTextLogs = (lines: string[]): ParsedTextLogsResult => {
    const capabilities: string[] = [];
    const requests: (ParsedTextLogsRequest | string)[] = [];
    const responses: unknown[] = [];
    let timeLastResponse: number | undefined;
    let startSessionReceived = false;

    lines.forEach((rawLine) => {
        const parts = rawLine.split(" ");
        const requestType = parts[2];

        if (
            ["SESSION_SETUP_TIME", "DEBUG", "STOP_SESSION"].includes(requestType)
        ) {
            return;
        }

        if (requestType === "START_SESSION") {
            startSessionReceived = true;
            return;
        }

        if (requestType === "REQUEST") {
            if (timeLastResponse !== undefined) {
                const timeRequest = Date.parse(`${parts[0]} ${parts[1]}`);
                const sleepTime = Math.floor((timeRequest - timeLastResponse) / 1000);
                if (sleepTime > 0) requests.push(`SLEEP ${sleepTime}`);
            }

            if (!startSessionReceived) {
                capabilities.push(buildCapabilities(rawLine.split("/session"),true));
                return;
            }

            const method = parts[5];
            const endpoint = "/" + parts[6].split("/").slice(3).join("/");

            let data: Record<string, unknown> | string = {};
            try {
                const parsed = JSON.parse(parts.slice(7).join(" "));
                data = parsed || {};
            } catch (err: any) {
                console.log(err.message);
                data = {};
            }

            requests.push({ method, endpoint, data });
        } else if (requestType === "RESPONSE") {
            let responseVal: unknown = "";
            try {
                responseVal = JSON.parse(parts.slice(3).join(" ")).value;
            } catch {
                responseVal = "";
            }
            responses.push(responseVal);
            timeLastResponse = Date.parse(`${parts[0]} ${parts[1]}`);
        }
    });

    return { capabilities, requests, responses };
};
