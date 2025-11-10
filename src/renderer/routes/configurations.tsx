import React from 'react';
import AdminCredentialsConfigForm from '../components/admin-configuration-form';
import DemoCredentialsConfigForm from '../components/demo-configuration-form';

export default function ConfigurationsPage() {

    return (
        <div className="p-8 grid md:grid-cols-2 gap-8">
            <AdminCredentialsConfigForm/>
            <DemoCredentialsConfigForm/>
        </div>
    );
}
