export { }
declare global {
    type CredentialsAPI = {
        setBrowserStackAdminCredentials: (username: string, accessKey: string, _rev?: string) => Promise<string>
        getBrowserStackAdminCredentials: () => Promise<BrowserStackCredentials | null>
        setBrowserStackDemoCredentials: (username: string, accessKey: string, _rev?: string) => Promise<string>
        getBrowserStackDemoCredentials: () => Promise<BrowserStackCredentials | null>
    }

    type BrowserStackAPI = {
        getAutomateSessionDetails: (id: string) => Promise<AutomateSessionResponse>
        getAutomateParsedTextLogs: (session: AutomateSessionResponse) => Promise<ParsedTextLogsResult>
        startSession: (options: StartSessionOptions) => Promise<StartSessionResponse>
        stopSession: (options: StopSessionOptions) => Promise<StopSessionResponse>
        executeCommand: (options: ExecuteCommandOptions) => any
        getAutomateParsedSessionLogs: (session: AutomateSessionResponse) => Promise<ScanResult>
        getAutomateParsedSeleniumLogs: (session: AutomateSessionResponse) => Promise<SeleniumScanResult>,
        getAutomateParsedTextLogs: (session:AutomateSessionResponse) => Promise<ParsedTextLogsResult>
        getSeleniumLogs: (selenium_logs_url: string) => Promise<string>
        getHarLogs: (harLogsUrl: string) => Promise<string>
        getScannerSessionIds: (thBuildId: string) => Promise<any>
    }

    type ElectronAPI = {
        openExternalUrl: (url: string) => Promise<void>
        
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
        browserstackAPI: BrowserStackAPI;
        electronAPI: ElectronAPI
    }

    interface ProductPageProps {
        tools: {
            title: string
            description: string,
            path: string
            component: ()=>React.ReactElement | null
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
        commandName: string
    }

    interface ParsedTextLogsResult {
        capabilities: any[];
        requests: (ParsedTextLogsRequest | string)[];
        responses: unknown[];
    }

    type StartSessionOptions = {
        capabilities: Record<string, any>
        hubUrl?: string
    }

    type StartSessionResponse = {
        sessionId: string
        raw: any
    }

    type StopSessionOptions = {
        hubUrl?: string,
        sessionId: string
    }

    type StopSessionResponse = {
        success: boolean,
        sessionId: string,
        raw: any,
    }

    type ExecuteCommandOptions = {
        request: ParsedTextLogsRequest
        response: any
        sessionId: string
        hubUrl?: string
    }


    // latency-finder

    interface LogParams {
    [key: string]: any;
    }

    interface LogRequest {
    created_at: number;
    line_number: number;
    out_time: number;
    http_type: string;
    action: string;
    params: LogParams;
    }

    interface LogResponse {
    created_at: number;
    line_number: number;
    in_time: number;
    params: LogParams;
    }

    interface LogDebug {
    created_at: number;
    line_number: number;
    url: string;
    }

    interface Exchange {
    id: number;
    request?: LogRequest;
    response?: LogResponse;
    debug?: LogDebug;
    }

    interface Summary {
    total_requests: number;
    session_started_at: number | null;
    session_completed_at: number | null;
    session_duration: number | null;
    setup_time: number;
    execution_time: number;
    in_time: number;
    out_time: number;
    passed_requests: number;
    failed_requests: number;
    unknown_requests: number;
    log_length: number;
    setup_time_perc: number;
    in_time_perc: number;
    out_time_perc: number;
    average_cycle_time: number;
    average_serve_time: number;
    average_wait_time: number;
    passed_perc: number;
    failed_perc: number;
    unknown_perc: number;
    }

    interface ScanResult {
    summary: Summary;
    exchanges: Exchange[];
    }


    type Phase = "Setup" | "Session" | "Tear Down" | null;

    interface SeleniumLogLineType {
    name: string;
    identifier: string;
    phase?: Phase;
    }

    interface LogHeaders {
    [key: string]: string;
    }

    interface LogRequest {
    created_at: number;
    line_number: number;
    out_time: number;
    params?: any;
    headers?: LogHeaders;
    }

    interface LogResponse {
    created_at?: number;
    line_number?: number;
    in_time?: number;
    params?: any;
    headers?: LogHeaders;
    }

    interface SeleniumExchange {
    id: number;
    request: LogRequest;
    response: LogResponse;
    }

    interface SeleniumSummary {
    total_requests: number;
    dialect: string;
    setup_polls: number;
    tear_down_polls: number;
    session_started_at: number;
    session_completed_at: number;
    driver_started_at: number;
    driver_init_time: number;
    session_duration: number | null;
    setup_time: number;
    execution_time: number;
    in_time: number;
    out_time: number;
    passed_requests: number;
    failed_requests: number;
    unknown_requests: number;
    log_length: number;
    setup_time_perc: number;
    in_time_perc: number;
    out_time_perc: number;
    average_cycle_time: number;
    average_serve_time: number;
    average_wait_time: number;
    passed_perc: number;
    failed_perc: number;
    unknown_perc: number;
    }

    interface SeleniumScanResult {
    summary: SeleniumSummary;
    exchanges: SeleniumExchange[];
    }
}