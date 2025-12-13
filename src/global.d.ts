export { }
declare global {
    type CredentialsAPI = {
        setBrowserStackAdminCredentials: (username: string, accessKey: string, _rev?: string) => Promise<string>
        getBrowserStackAdminCredentials: () => Promise<BrowserStackCredentials | null>
    }

    type BrowserStackAPI = {
        getAutomateSessionDetails: (id: string) => Promise<AutomateSessionResponse>
        getAutomateParsedTextLogs: (session:AutomateSessionResponse) => Promise<ParsedTextLogsResult>
        getSeleniumLogs: (selenium_logs_url: string) => Promise<string>
        getHarLogs: (harLogsUrl: string) => Promise<string>
    }

    interface DBItem {
        _rev?: string
    }

    interface BrowserStackCredentials extends DBItem {
        username: string
        accessKey: string
    }

    interface Window {
        credentialsAPI: CredentialsAPI;
        browserstackAPI: BrowserStackAPI
    }

    interface ProductPageProps {
        tools: {
            title: string
            description: string,
            path: string
        }[]
    }

    type AutomateSessionResponse = {
        automation_session: {
            name: string;
            duration: number;
            os: string;
            os_version: string;
            browser_version: string;
            browser: string;
            device: string | null;
            status: "done" | "error" | "running" | string;
            hashed_id: string;
            reason: string | null;
            build_name: string;
            project_name: string;
            test_priority: number | null;
            logs: string;
            browserstack_status: "done" | "error" | "queued" | string;
            created_at: string; // ISO timestamp
            browser_url: string;
            public_url: string;
            appium_logs_url: string;
            video_url: string;
            browser_console_logs_url: string;
            har_logs_url: string;
            selenium_logs_url: string;
            selenium_telemetry_logs_url: string;
        };
    };

    interface ParsedTextLogsRequest {
        method: string;
        endpoint: string;
        data: Record<string, unknown> | string;
    }

    interface ParsedTextLogsResult {
        capabilities: string[];
        requests: (ParsedTextLogsRequest | string)[];
        responses: unknown[];
    }

}