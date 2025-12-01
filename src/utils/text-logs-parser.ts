

const buildCapabilities = (line: string[], isAppAutomate: boolean) => {
    let caps = JSON.parse(line[1]);
    return (isAppAutomate ? caps : caps.desiredCapabilities);
};

const WebDriverCommandMap: Record<string, string> = {
    "POST /session": "newSession",
    "DELETE /session/:sessionId": "deleteSession",

    "POST /session/:sessionId/url": "navigateTo",
    "GET /session/:sessionId/url": "getCurrentUrl",
    "POST /session/:sessionId/back": "navigateBack",
    "POST /session/:sessionId/forward": "navigateForward",
    "POST /session/:sessionId/refresh": "refresh",

    "GET /session/:sessionId/title": "getTitle",

    "POST /session/:sessionId/window": "createNewWindow",
    "DELETE /session/:sessionId/window": "closeWindow",
    "GET /session/:sessionId/window": "getWindowHandle",
    "GET /session/:sessionId/window/handles": "getWindowHandles",
    "POST /session/:sessionId/window/rect": "setWindowRect",
    "GET /session/:sessionId/window/rect": "getWindowRect",
    "POST /session/:sessionId/window/maximize": "maximizeWindow",
    "POST /session/:sessionId/window/minimize": "minimizeWindow",
    "POST /session/:sessionId/window/fullscreen": "fullscreenWindow",

    "POST /session/:sessionId/element": "findElement",
    "POST /session/:sessionId/elements": "findElements",
    "POST /session/:sessionId/element/:id/element": "findElementFromElement",
    "POST /session/:sessionId/element/:id/elements": "findElementsFromElement",

    "GET /session/:sessionId/element/:id/attribute/:name": "getElementAttribute",
    "GET /session/:sessionId/element/:id/property/:name": "getElementProperty",
    "GET /session/:sessionId/element/:id/css/:propertyName": "getElementCSSValue",
    "GET /session/:sessionId/element/:id/text": "getElementText",
    "GET /session/:sessionId/element/:id/name": "getElementTagName",
    "GET /session/:sessionId/element/:id/rect": "getElementRect",
    "GET /session/:sessionId/element/:id/enabled": "isElementEnabled",
    "GET /session/:sessionId/element/:id/displayed": "isElementDisplayed",
    "GET /session/:sessionId/element/:id/selected": "isElementSelected",

    "POST /session/:sessionId/element/:id/click": "elementClick",
    "POST /session/:sessionId/element/:id/clear": "elementClear",
    "POST /session/:sessionId/element/:id/value": "elementSendKeys",

    "GET /session/:sessionId/source": "getPageSource",

    "POST /session/:sessionId/execute/sync": "executeScript",
    "POST /session/:sessionId/execute/async": "executeAsyncScript",

    "POST /session/:sessionId/cookie": "addCookie",
    "GET /session/:sessionId/cookie": "getCookies",
    "GET /session/:sessionId/cookie/:name": "getCookie",
    "DELETE /session/:sessionId/cookie": "deleteAllCookies",
    "DELETE /session/:sessionId/cookie/:name": "deleteCookie",

    "GET /session/:sessionId/alert/text": "getAlertText",
    "POST /session/:sessionId/alert/accept": "acceptAlert",
    "POST /session/:sessionId/alert/dismiss": "dismissAlert",
    "POST /session/:sessionId/alert/text": "sendAlertText",

    "POST /session/:sessionId/frame": "switchToFrame",
    "POST /session/:sessionId/frame/parent": "switchToParentFrame",

    "POST /session/:sessionId/timeouts": "setTimeouts",

    "POST /session/:sessionId/actions": "performActions",
    "DELETE /session/:sessionId/actions": "releaseActions",

    "GET /session/:sessionId/screenshot": "takeScreenshot",
    "GET /session/:sessionId/element/:id/screenshot": "takeElementScreenshot",
};

const JSONWireCommandMap: Record<string, string> = {
    "GET /wd/hub/status": "status",
    "POST /wd/hub/session": "newSession",
    "DELETE /wd/hub/session/:sessionId": "deleteSession",

    "POST /wd/hub/session/:sessionId/element": "findElement",
    "POST /wd/hub/session/:sessionId/elements": "findElements",

    "POST /wd/hub/session/:sessionId/element/:id/click": "elementClick",
    "POST /wd/hub/session/:sessionId/element/:id/clear": "elementClear",
    "POST /wd/hub/session/:sessionId/element/:id/value": "elementSendKeys",

    "GET /wd/hub/session/:sessionId/source": "getPageSource",
    "GET /wd/hub/session/:sessionId/url": "getCurrentUrl",
    "POST /wd/hub/session/:sessionId/url": "navigateTo",

    "POST /wd/hub/session/:sessionId/execute": "executeScript",
};

const AppiumCommandMap: Record<string, string> = {
    "POST /session/:sessionId/appium/device/lock": "lockDevice",
    "POST /session/:sessionId/appium/device/unlock": "unlockDevice",
    "GET /session/:sessionId/appium/device/time": "getDeviceTime",
    "POST /session/:sessionId/appium/app/launch": "launchApp",
    "POST /session/:sessionId/appium/app/close": "closeApp",
    "POST /session/:sessionId/appium/device/press_keycode": "pressKeyCode",
    "POST /session/:sessionId/appium/device/long_press_keycode": "longPressKeyCode",
    "POST /session/:sessionId/appium/device/touch_id": "touchId",
    "POST /session/:sessionId/appium/device/shake": "shakeDevice",
    "POST /session/:sessionId/appium/device/hide_keyboard": "hideKeyboard",
    "POST /session/:sessionId/appium/device/is_keyboard_shown": "isKeyboardShown",
};

const CommandMap = {
    ...WebDriverCommandMap,
    ...JSONWireCommandMap,
    ...AppiumCommandMap,
};

const resolveCommandName = (method: string, endpoint: string): string => {
    const normalized = `${method.toUpperCase()} ${endpoint}`;

    // exact match first
    if (CommandMap[normalized]) return CommandMap[normalized];

    // pattern match
    for (const pattern of Object.keys(CommandMap)) {
        const [pMethod, pPath] = pattern.split(" ");
        if (pMethod !== method.toUpperCase()) continue;

        const regex = new RegExp(
            "^" +
            pPath
                .replace(/\//g, "\\/")
                .replace(/:sessionId/g, "[^/]+")
                .replace(/:id/g, "[^/]+")
                .replace(/:name/g, "[^/]+")
                .replace(/:propertyName/g, "[^/]+") +
            "$"
        );

        if (regex.test(endpoint)) {
            return CommandMap[pattern];
        }
    }

    return "unknownCommand";
};


export const parseAutomateTextLogs = (lines: string[]): ParsedTextLogsResult => {
    const capabilities: string[] = [];
    const requests: (ParsedTextLogsRequest | string)[] = [];
    const responses: unknown[] = [];
    let timeLastResponse: number | undefined;

    lines.forEach((line, i) => {
        if ([1, 2, 3].includes(i)) return;

        if (i === 0) {
            capabilities.push(buildCapabilities(line.split("/session"), false));
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
            const commandName = resolveCommandName(method, parts[6])

            let data: Record<string, unknown> | string = {};
            try {
                console.log(parts.slice(7).join(" "));
                const parsed = JSON.parse(parts.slice(7).join(" "));
                data = parsed || {};
            } catch (err: any) {
                console.log(err.message);
                data = {};
            }

            requests.push({ method, endpoint, data, commandName });
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
                capabilities.push(buildCapabilities(rawLine.split("/session"), true));
                return;
            }

            const method = parts[5];
            const endpoint = "/" + parts[6].split("/").slice(3).join("/");
            const commandName = resolveCommandName(method, parts[6])

            let data: Record<string, unknown> | string = {};
            console.log(rawLine)
            try {
                let raw = parts.slice(7).join(" ");
                raw = fixEmbeddedJson(raw);
                const parsed = JSON.parse(raw);
                data = parsed || {};
            } catch (err: any) {
                console.log(err.message);
                data = {};
            }

            requests.push({ method, endpoint, data, commandName });
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

function fixEmbeddedJson(input: string): string {
    return input.replace(
        /"([^"]+)":"([^"]*{[^"]*}[^"]*)"/g,  // matches key: " value-with-{...} "
        (fullMatch, key, value) => {
            try {
                // detect all { ... } blocks inside the string
                return fullMatch.replace(/\{[^{}]*\}/g, (jsonBlock) => {
                    // try parsing the block
                    const parsed = JSON.parse(jsonBlock);
                    // re-stringify the block so quotes escape correctly
                    return JSON.stringify(parsed);
                });
            } catch {
                return fullMatch; // leave unchanged if not valid JSON
            }
        }
    );
}