import { LayoutRouteProps, Outlet, RouteProps } from "react-router-dom";
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";
import { ToastContainer } from 'react-toastify';
export default function Layout() {
    return (
        <div className="flex flex-col w-screen h-screen overflow-none">
            <Navbar/>
            <main className="flex flex-1">
                <aside className="w-[250px] bg-white h-full border-r border-gray-200 shadow-sm">
                    <Sidebar/>
                </aside>
                <div className="flex-1 overflow-auto">
                    <Outlet/>
                </div>
            </main>
            <ToastContainer/>
        </div>
    )
}