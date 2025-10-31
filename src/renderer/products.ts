import AutomatePage from "./routes/automate";
import ReplayTool from "./routes/automate/tools/replay-tool";

const Products = [
    {
        name:"Automate",
        path:'/automate',
        page: AutomatePage,
        tools:[
            {
                title:"Replay Toolkit",
                description:"Replays the sessions on BrowserStack by parsing Raw Logs",
                path:'/automate/replay-toolkit',
                component: ReplayTool
            },
            {
                title:"Latency Analyser",
                description:"Analyses time spend on different actions. Helpful to identify inside/outside time for a customer session.",
                path:'/automate/latency-analyser',
                component: null
            }
        ]
    }
]

export default Products;