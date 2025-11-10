import React from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './layout';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import ConfigurationsPage from './routes/configurations';
import Products from './products';

const Router = createHashRouter([
    {
        Component: Layout,
        children: [
            {
                index: true,
                path: '',
                Component: ConfigurationsPage
            },
            ...Products.map((p)=>{
                return {
                    path:p.path,
                    element:<p.page tools={p.tools} />,
                }
            }),
            ...Products.flatMap((p)=>p.tools).map((tool)=>{
                return {
                    path: tool.path,
                    element: <tool.component/>
                }
            })
        ]
    }
])

const App = () => (
    <RouterProvider router={Router} />
)
const root = createRoot(document.body);
root.render(<App />);