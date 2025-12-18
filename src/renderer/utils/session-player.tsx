export default class SessionPlayer {
    // --- Constants ---
    static readonly RESPONSE_ELEMENT_ID_KEY = 'element-6066-11e4-a52e-4f735466cecf';
    static readonly SENDKEYS_REQUEST_URL_REGEX = /\/element\/.[^\/]+\/value$/;
    static readonly ELEMENT_REQUEST_URL_REGEX = /\/element\/[0-9a-zA-Z.-]+\/[a-z]+/;
    static readonly ACTIONS_REQUEST_URL_REGEX = /\/actions$/;

    sessionId?: string;

    constructor(
        private textLogsResult: ParsedTextLogsResult,
        private hubUrl?: string
    ) { }

    // ---------------------------------------------------------
    // Logging helper
    // ---------------------------------------------------------
    private log(level: "debug" | "info" | "warn" | "error", msg: string, data?: any) {
        const prefix = `[SessionPlayer]`;
        if (data !== undefined) console[level](`${prefix} ${msg}`, data);
        else console[level](`${prefix} ${msg}`);
    }

    // ---------------------------------------------------------
    // Session control
    // ---------------------------------------------------------
    async startSession(caps: any) {
        this.log("info", "Starting session…");

        const res = await window.browserstackAPI.startSession({
            capabilities: JSON.parse(caps),
            hubUrl: this.hubUrl
        });

        this.sessionId = res.sessionId;
        this.log("info", `Session started`, { sessionId: this.sessionId });

        return res;
    }

    async stopSession() {
        this.log("info", "Stopping session…", { sessionId: this.sessionId });
        const res = await window.browserstackAPI.stopSession({
            sessionId: this.sessionId,
            hubUrl: this.hubUrl
        });
        this.log("info", "Session stopped.");
        return res;
    }

    setHubUrl(url: string) {
        this.log("info", `Hub URL updated: ${url}`);
        this.hubUrl = url;
    }

    async sleep(seconds: number) {
        this.log("debug", `Sleeping for ${seconds}s…`);
        return new Promise((res) => setTimeout(res, seconds * 1000));
    }

    // ---------------------------------------------------------
    // Main iterator
    // ---------------------------------------------------------
    async *executeNextRequest() {
        this.log("info", "Starting request replay…");

        const requests = this.textLogsResult.requests;
        const responses = this.textLogsResult.responses;

        let sessionElementIds: string[] = [];
        let rawLogElementIds: string[] = [];
        let mappedElementId = '';
        let res: any

        for (let i = 0; i < requests.length; i++) {
            this.log("debug", "Iteration", i)
            const req = requests[i];
            const rawResponse = responses[i];
            const sentRequest: ParsedTextLogsRequest | string = JSON.parse(JSON.stringify(req));

            this.log("debug", `Processing request #${i}`, { req });

            // ----- Handle SLEEP -----
            if (typeof req === "string" && req.startsWith("SLEEP")) {
                const parts = req.trim().split(/\s+/);
                const sleepTime = Number(parts[1]);

                this.log("info", `SLEEP command encountered: ${sleepTime}s`);

                if (!Number.isNaN(sleepTime)) {
                    await this.sleep(sleepTime);
                }
            } else if (req && typeof req !== "string" && req.endpoint === "/") {
                this.log("debug", "Root endpoint encountered; skipping WebDriver call.");
            } else {

                // ----- Element-ID resolution -----
                mappedElementId = this.getElementId(req as ParsedTextLogsRequest, sessionElementIds, rawLogElementIds);
                this.log("debug", `Resolved elementId`, { mappedElementId });

                // ----- Execute BrowserStack request -----
                this.log("info", `Executing command: ${(req as ParsedTextLogsRequest).endpoint}`, {
                    elementId: mappedElementId
                });

                try {
                    const isFindELements = (req as ParsedTextLogsRequest).commandName == 'findElement' || (req as ParsedTextLogsRequest).commandName == 'findElements';
                    const executeCommand = () => {
                        if (mappedElementId) {
                            (sentRequest as ParsedTextLogsRequest).endpoint = this.replaceElementIdInEndpoint((sentRequest as ParsedTextLogsRequest).endpoint, mappedElementId);
                            if ((sentRequest as ParsedTextLogsRequest).data) {
                                (sentRequest as ParsedTextLogsRequest).data = this.replaceElementIdDeep((sentRequest as ParsedTextLogsRequest).data, mappedElementId);
                            }
                        }
                        return window.browserstackAPI.executeCommand({
                            request: sentRequest as ParsedTextLogsRequest,
                            response: rawResponse,
                            hubUrl: this.hubUrl,
                            sessionId: this.sessionId,
                        })
                    }
                    const sessionResponse = isFindELements ? await this.retryUntilTimeout(executeCommand) : await executeCommand();

                    this.log("debug", `Raw response received`, { sessionResponse });

                    // ----- Process element IDs in response -----
                    const idExtract = this.fetchElementIds(
                        sessionResponse,
                        req as ParsedTextLogsRequest,
                        rawLogElementIds,
                        sessionElementIds
                    );

                    rawLogElementIds.push(...idExtract.rawLogsElementIdArray)
                    sessionElementIds.push(...idExtract.sessionElementIdArray)

                    if (rawLogElementIds.length || sessionElementIds.length) {
                        this.log("debug", "Updated element ID arrays", {
                            rawLogElementIds,
                            sessionElementIds
                        });
                    }
                    res = sessionResponse

                } catch (err) {
                    yield { req: sentRequest, res: { error: err } }
                    continue;
                }
            }
            yield { req, res };
        }

        this.log("info", "Finished executing all requests.");
    }

    // ---------------------------------------------------------
    // Helpers: fetching, mapping, extracting element IDs
    // ---------------------------------------------------------
    private getRequestsWithoutSleep() {
        return this.textLogsResult.requests.filter((req) => typeof req === "object");
    }

    private getElementIdArray(response: any) {
        let arr: string[] = [];

        if (response && !response.error) {
            if (response[SessionPlayer.RESPONSE_ELEMENT_ID_KEY] || response["ELEMENT"]) {
                arr = [
                    response[SessionPlayer.RESPONSE_ELEMENT_ID_KEY] ??
                    response["ELEMENT"]
                ];
            } else if (Array.isArray(response) && response[0] &&
                (response[0][SessionPlayer.RESPONSE_ELEMENT_ID_KEY] || response[0]["ELEMENT"])
            ) {
                const key = response[0][SessionPlayer.RESPONSE_ELEMENT_ID_KEY]
                    ? SessionPlayer.RESPONSE_ELEMENT_ID_KEY
                    : "ELEMENT";

                arr = response.map((obj: any) => obj[key]);
            }
        }

        return arr;
    }

    private getRawLogsElementIdArray(req: ParsedTextLogsRequest) {
        const realRequests = this.getRequestsWithoutSleep();
        const requestIndex = realRequests.indexOf(req);
        const response = this.textLogsResult.responses?.[requestIndex];
        return this.getElementIdArray(response);
    }

    private fetchElementIds(
        sessionResponse: any,
        request: ParsedTextLogsRequest,
        rawLogIds: string[],
        sessionIds: string[]
    ) {
        const data = sessionResponse;

        if (!data) return { rawLogsElementIdArray: rawLogIds, sessionElementIdArray: sessionIds };

        const containsElement =
            JSON.stringify(data).includes("ELEMENT") ||
            JSON.stringify(data).includes(SessionPlayer.RESPONSE_ELEMENT_ID_KEY);

        if (containsElement) {
            const value = data.value;
            sessionIds = this.getElementIdArray(value);
            rawLogIds = this.getRawLogsElementIdArray(request);
        }

        return {
            rawLogsElementIdArray: rawLogIds,
            sessionElementIdArray: sessionIds
        };
    }

    private getElementId(
        req: ParsedTextLogsRequest,
        sessionElementIds: string[],
        rawLogElementIds: string[]
    ) {
        let elementId = "";
        let index;

        const extractFromEndpoint = (endpoint: string) => {
            const split = endpoint.split("/");
            const pos = split.indexOf("element");
            return split[pos + 1];
        };

        // simple element commands (/element/<id>/click)
        if (SessionPlayer.ELEMENT_REQUEST_URL_REGEX.test(req.endpoint)) {
            elementId = extractFromEndpoint(req.endpoint);
            index = rawLogElementIds.indexOf(elementId);
        }

        // actions → pointerMove with ELEMENT origin
        else if (req.commandName === "performActions") {
            const actions = (req.data as any).actions?.[0]?.actions?.filter(
                (a: any) => a.type === "pointerMove"
            );

            if (actions?.[0]) {
                const origin = actions[0].origin;
                index = rawLogElementIds.indexOf(origin?.ELEMENT);
            }
        }

        else if (req.commandName == "executeScript" || req.commandName == "executeAsyncScript") {
            const args = (req.data as any).args?.[0]
            if (args) {
                const elementId = args[SessionPlayer.RESPONSE_ELEMENT_ID_KEY] || args["ELEMENT"]
                if (elementId) {
                    index = rawLogElementIds.indexOf(elementId)
                }
            }
        }

        const finalId = sessionElementIds[index] ?? "";
        this.log("debug", "Element ID mapped", { raw: elementId, mapped: finalId });

        return finalId;
    }

    private replaceElementIdDeep(obj: any, newId: string): any {
        if (obj === null || obj === undefined) return obj;

        // Replace scalar strings equal to an elementId
        if (typeof obj === "string") {
            return obj;
        }

        // Replace element reference objects
        if (typeof obj === "object") {
            // Handle WebDriver element references
            if (obj.ELEMENT) obj.ELEMENT = newId;
            if (obj["element-6066-11e4-a52e-4f735466cecf"])
                obj["element-6066-11e4-a52e-4f735466cecf"] = newId;
            if (obj.id) obj.id = newId;

            // Handle W3C Actions API origin element
            if (obj.type === "pointerMove" && obj.origin && typeof obj.origin === "object") {
                if (obj.origin.ELEMENT || obj.origin["element-6066-11e4-a52e-4f735466cecf"]) {
                    obj.origin = newId;
                }
            }

            // Deep recursion
            for (const key of Object.keys(obj)) {
                obj[key] = this.replaceElementIdDeep(obj[key], newId);
            }
        }

        // Handle array recursively
        if (Array.isArray(obj)) {
            return obj.map(item => this.replaceElementIdDeep(item, newId));
        }

        return obj;
    }

    private async retryUntilTimeout<T>(
        fn: () => Promise<T>,
        timeoutMs: number = 30000,
        intervalMs: number = 500
    ): Promise<T> {

        const start = Date.now();

        while (true) {
            try {
                const result = await fn();      // Attempt the function
                return result;                  // Success → return immediately
            } catch (err) {
                // If timeout reached → throw final error
                if (Date.now() - start >= timeoutMs) {
                    throw err
                }
                // Wait before retrying
                await new Promise(res => setTimeout(res, intervalMs));
            }
        }
    }

    private replaceElementIdInEndpoint(endpoint: string, elementId: string): string {
        return endpoint.replace(/element\/[0-9a-zA-Z.-]+/, 'element/' + elementId);
    }
}
