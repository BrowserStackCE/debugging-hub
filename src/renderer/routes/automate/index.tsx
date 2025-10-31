import { NavLink } from "react-router-dom"

export default function AutomatePage(props: ProductPageProps) {
    const { tools } = props
    return (
        <div className="p-5">
            <div className="grid grid-col-3 lg:grid-cols-4 gap-4">
                {tools.map((tool) => {
                    return (
                        <NavLink key={tool.path} to={tool.path} >
                            <div className="card bg-base-100 w-full h-full shadow-sm border">
                                <div className="card-body">
                                    <h2 className="card-title">{tool.title}</h2>
                                    <p>{tool.description}</p>
                                </div>
                            </div>
                        </NavLink>
                    )
                })}
            </div>
        </div>
    )
}