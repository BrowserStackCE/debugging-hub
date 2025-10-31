import { useEffect } from 'react';
import Form from 'rc-field-form';
import { toast } from 'react-toastify';
const { Field } = Form
export default function AdminCredentialsConfigForm() {
    const [form] = Form.useForm()
    const handleSubmission = async (input: BrowserStackCredentials) => {
        
        toast.promise(window.credentialsAPI.setBrowserStackAdminCredentials(input.username, input.accessKey,input._rev),{
            pending:"Saving credentials",
            success:"Credentials Saved successfully",
            error:"Something went wrong. Please check the console"
        }).then((rev)=>{
            form.setFieldValue('_rev',rev)
        }).catch((err)=>{
            console.error(err)
        })
    }

    const fetchCredentials = ()=>{
        window.credentialsAPI.getBrowserStackAdminCredentials().then((creds) => {
            console.log(creds)
            if (creds) {
                form.setFieldsValue({
                    username: creds.username,
                    accessKey: creds.accessKey,
                    _rev: creds._rev
                });
            }
        })
    }
    useEffect(() => {
        fetchCredentials()
    }, [])
    return (
        <div className="p-6 rounded-box">
            <h2 className="text-lg font-bold mb-4">Admin Credentials</h2>
            <Form form={form} className='flex flex-col' onFinish={handleSubmission}>
                <Field
                    name="username"
                    rules={[{ required: true, message: 'Username is required' }]}
                >
                    {(control, meta) => (
                        <div className="form-control mb-4 flex flex-col">
                            <label className="label">
                                <span className="label-text">Username</span>
                            </label>
                            <input
                                {...control}
                                className="input input-bordered w-full placeholder-gray-300"
                                placeholder="BrowserStack Admin Username"
                            />
                            {meta.errors.length > 0 && (
                                <p className="text-error text-sm mt-1">{meta.errors[0]}</p>
                            )}
                        </div>
                    )}
                </Field>

                <Field
                    name="accessKey"
                    rules={[{ required: true, message: "Access Key is required" }]}
                >
                    {(control) => (
                        <div className="form-control mb-4 flex flex-col">
                            <label className="label">
                                <span className="label-text">Access Key</span>
                            </label>
                            <input
                                {...control}
                                className="input input-bordered w-full placeholder-gray-300"
                                placeholder="BrowserStack Admin Access Key"
                            />
                        </div>
                    )}
                </Field>

                <Field name="_rev" >
                    <input hidden />
                </Field>

                <button type="submit" className="btn btn-primary">Save</button>
            </Form>
        </div>
    )
}