import { NavLink } from "react-router-dom"

export default function WebsiteScannerPage(props: ProductPageProps) {
    const { tools } = props

    return (
        <div className="p-5">
            <div className="grid grid-col-3 lg:grid-cols-4 gap-4">
                {tools.map((tool) => {
                    const isComingSoon = tool.component === null

                    const Card = (
                        <div className="card bg-base-100 w-full h-full shadow-sm border">
                            <div className="card-body">
                                <h2 className="card-title flex items-center gap-2">
                                    {tool.title}
                                </h2>
                                <p>{tool.description}</p>
                                <div>
                                    {isComingSoon && (
                                        <span className="badge badge-warning badge-sm">
                                            Coming soon
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )

                    return isComingSoon ? (
                        <div key={tool.path} className="cursor-not-allowed opacity-60">
                            {Card}
                        </div>
                    ) : (
                        <NavLink key={tool.path} to={tool.path}>
                            {Card}
                        </NavLink>
                    )
                })}
            </div>
        </div>
    )
}
