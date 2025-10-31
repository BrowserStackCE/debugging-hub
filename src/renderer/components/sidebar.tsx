import { NavLink, useLocation } from "react-router-dom"
import Products from "../products"

const TopMenu = [
    {
        title: "Configurations",
        path: '/'
    },
]
const ProductsMenu = [
    {
        title: "Automate",
        path: '/automate'
    },
    {
        title: "App Automate",
        path: '/app-automate'
    },
    {
        title: "Percy",
        path: '/percy'
    },
    {
        title: "Accessibility",
        path: '/accessibility'
    }
]

export default function Sidebar() {
    const location = useLocation()
    console.log(location)
    return (
        <div>
            <ul className="menu bg-base-200 w-full bg-transparent p-4 gap-4">
                {TopMenu.map((item) => {
                    const isActive = location.pathname == item.path
                    return (
                        <li className={`${isActive?'menu-active':''}`} key={item.path}><NavLink to={item.path} >{item.title}</NavLink></li>
                    )
                })}
                <label className="font-bold" htmlFor="">Products</label>
                {Products.map((item) => {
                    const isActive = location.pathname.includes(item.path)
                    return (
                        <li className={`${isActive?'menu-active':''}`} key={item.path}><NavLink to={item.path} >{item.name}</NavLink></li>
                    )
                })}
            </ul>
        </div>
    )
}