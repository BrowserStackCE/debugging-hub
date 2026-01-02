import AutomatePage from "./routes/automate";
import ReplayTool from "./routes/automate/tools/replay-tool";
import LatencyFinder from "./routes/automate/tools/latency-finder";
import SessionComparison from "./routes/automate/tools/session-comparison";
import AppAutomatePage from "./routes/percy/tools";
import SnapshotReplay from "./routes/percy/tools/snapshot-replay";

const Products = [
  {
    name: "Automate",
    path: "/automate",
    page: AutomatePage,
    tools: [
      {
        title: "Replay Toolkit",
        description: "Replays the sessions on BrowserStack by parsing Raw Logs",
        path: "/automate/replay-toolkit",
        component: ReplayTool,
      },
      {
        title: "Latency Analyser",
        description:
          "Analyses time spend on different actions. Helpful to identify inside/outside time for a customer session.",
        path: "/automate/latency-analyser",
        component: LatencyFinder,
      },
      {
        title: "Session Comparison",
        description: "Compares logs across sessions and highlights differences",
        path: '/automate/session-comparison',
        component: SessionComparison
      }
    ],
  },
  {
    name: "App Automate",
    path: "/app-automate",
    page: AppAutomatePage,
    tools: [
      {
        title: "Replay Toolkit",
        description: "Replays the sessions on BrowserStack by parsing Raw Logs",
        path: "/automate/replay-toolkit",
        component: null,
      },
      {
        title: "Latency Analyser",
        description:
          "Analyses time spend on different actions. Helpful to identify inside/outside time for a customer session.",
        path: "/automate/latency-analyser",
        component: null,
      },
      {
        title: "Session Comparison",
        description: "Compares logs across sessions and highlights differences",
        path: '/automate/session-comparison',
        component: null
      }
    ],
  },
  {
    name: "Percy",
    path: "/percy",
    page: AutomatePage,
    tools: [
      {
        title: "Snapshot Replay",
        description: "Replay snapshots",
        path: "/percy/snapshot-replay",
        component: SnapshotReplay,
      },
      {
        title: "CLI Logs Downloader",
        description: "Download CLI logs using hash ID displayed in Customer's console",
        path: "/percy/cli-log-downloader",
        component: null,
      },
    ],
  },
  {
    name: "Test Report & Analytics",
    path: "/tra",
    page: AutomatePage,
    tools: [
      {
        title: "SDK Logs Downloader",
        description: "Download SDK logs from Backend",
        path: "/tra/download-logs",
        component: null,
      },
    ],
  },
  {
    name: "Web Accessibility",
    path: "/web-accessibility",
    page: AutomatePage,
    tools: [
      {
        title: "Automate Session Finder",
        description: "Find associated automate session for accessibility scanner run",
        path: "/web-a11y/session-finder",
        component: null,
      },
    ],
  },
];

export default Products;
