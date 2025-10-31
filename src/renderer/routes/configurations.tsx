import React from 'react';
import AdminCredentialsConfigForm from '../components/admin-configuration-form';

export default function ConfigurationsPage() {
    const handleGeneralSubmit = (values: any) => {
        console.log('General Settings:', values);
    };

    const handleSecuritySubmit = (values: any) => {
        console.log('Security Settings:', values);
    };

    return (
        <div className="p-8 grid md:grid-cols-2 gap-8">
            <AdminCredentialsConfigForm/>

        </div>
    );
}
