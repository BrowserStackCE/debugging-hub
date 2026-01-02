interface DebugOptionsFormProps {
    browser: string;
    width: string;
    headless: boolean;
    withBaseline: boolean;
    saveResources: boolean;
    bstackLocalKey: string;
    percyToken: string;
    onBrowserChange: (value: string) => void;
    onWidthChange: (value: string) => void;
    onHeadlessChange: (checked: boolean) => void;
    onWithBaselineChange: (checked: boolean) => void;
    onSaveResourcesChange: (checked: boolean) => void;
    onBstackLocalKeyChange: (value: string) => void;
    onPercyTokenChange: (value: string) => void;
    disabled?: boolean;
}

const checkboxStyles = {
    className: "w-4 h-4 appearance-none bg-white border-gray-800 border-2 rounded text-black transition-all duration-200 ease-in-out checked:bg-black checked:border-black focus:outline-none focus:ring-0",
    style: {
        backgroundImage: `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='m13.854 3.646-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.293l7.146-7.147a.5.5 0 0 1 .708.708z'/%3e%3c/svg%3e")`,
        backgroundSize: '12px 12px',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
    }
};

export default function DebugOptionsForm({
    browser,
    width,
    headless,
    withBaseline,
    saveResources,
    bstackLocalKey,
    percyToken,
    onBrowserChange,
    onWidthChange,
    onHeadlessChange,
    onWithBaselineChange,
    onSaveResourcesChange,
    onBstackLocalKeyChange,
    onPercyTokenChange,
    disabled = false
}: DebugOptionsFormProps) {
    const handleOpenPercyUrl = () => {
        const url = 'https://percy.io/api/v1/tokens';
        window.electronAPI.openExternalUrl(url);
    };

    return (
        <div className="border-t border-base-300 pt-6">
            <h3 className="text-lg font-semibold mb-4">Debug Options</h3>
            
            <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Browser</span>
                        </label>
                        <select 
                            className="select select-bordered w-full"
                            value={browser}
                            onChange={(e) => onBrowserChange(e.target.value)}
                            disabled={disabled}
                        >
                            <option value="chrome">Chrome</option>
                            <option value="firefox">Firefox</option>
                            <option value="edge">Edge</option>
                            <option value="safari">Safari</option>
                            <option value="safari-on-iphone">Safari on iPhone</option>
                            <option value="chrome-on-android">Chrome on Android</option>
                        </select>
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Width (px)</span>
                        </label>
                        <input 
                            type="number"
                            className="input input-bordered w-full bg-gray-50 border-gray-300 text-gray-600 placeholder:text-gray-400"
                            value={width}
                            onChange={(e) => onWidthChange(e.target.value)}
                            placeholder="1920 (default)"
                            min="320"
                            max="3840"
                            disabled={disabled}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">BStack Local Key</span>
                        </label>
                        <input 
                            type="text"
                            className="input input-bordered w-full bg-gray-50 border-gray-300 text-gray-600 placeholder:text-gray-400"
                            value={bstackLocalKey}
                            onChange={(e) => onBstackLocalKeyChange(e.target.value)}
                            placeholder="Enter BrowserStack access key"
                            disabled={disabled}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text font-medium">Percy Token</span>
                        </label>
                        <input 
                            type="text"
                            className="input input-bordered w-full bg-gray-50 border-gray-300 text-gray-600 placeholder:text-gray-400"
                            value={percyToken}
                            onChange={(e) => onPercyTokenChange(e.target.value)}
                            placeholder="Enter Percy token"
                            disabled={disabled}
                        />
                        <label className="label overflow-hidden min-w-0">
                            <span className="label-text-alt text-gray-500 text-xs break-words text-wrap">
                                Get your token from{' '}
                                <button 
                                    type="button"
                                    onClick={handleOpenPercyUrl}
                                    className="text-blue-600 hover:text-blue-800 underline break-all cursor-pointer bg-transparent border-none p-0 text-wrap"
                                >
                                    percy.io/api/v1/tokens
                                </button>
                            </span>
                        </label>
                    </div>
                </div>

                <div className="form-control">
                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="label-text font-medium text-sm">Headless Mode</span>
                            <input 
                                type="checkbox" 
                                {...checkboxStyles}
                                checked={headless}
                                onChange={(e) => onHeadlessChange(e.target.checked)}
                                disabled={disabled}
                            />
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="label-text font-medium text-sm">With Baseline</span>
                            <input 
                                type="checkbox" 
                                {...checkboxStyles}
                                checked={withBaseline}
                                onChange={(e) => onWithBaselineChange(e.target.checked)}
                                disabled={disabled}
                            />
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="label-text font-medium text-sm">Save Resources</span>
                            <input 
                                type="checkbox" 
                                {...checkboxStyles}
                                checked={saveResources}
                                onChange={(e) => onSaveResourcesChange(e.target.checked)}
                                disabled={disabled}
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
