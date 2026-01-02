import { useState } from 'react'
import { toast } from 'react-toastify'

// Function to extract thBuildId from various URL formats
const extractThBuildId = (url: string): string | null => {
    try {
        const urlObj = new URL(url)
        
        // Case 1: Direct thBuildId in query params
        const thBuildId = urlObj.searchParams.get('thBuildId')
        if (thBuildId) {
            return thBuildId
        }
        
        // Case 2: thBuildId in reportUrl parameter (nested URL)
        const reportUrl = urlObj.searchParams.get('reportUrl')
        if (reportUrl) {
            const reportUrlObj = new URL(decodeURIComponent(reportUrl))
            const nestedThBuildId = reportUrlObj.searchParams.get('thBuildId')
            if (nestedThBuildId) {
                return nestedThBuildId
            }
        }
        
        return null
    } catch (error) {
        console.error('Error parsing URL:', error)
        return null
    }
}

export default function SessionFinder() {
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionData, setSessionData] = useState<any>(null)

    const handleFindSession = async () => {
        if (!url.trim()) {
            toast.error('Please enter a Website Scanner Accessibility Report URL')
            return
        }

        setIsLoading(true)
        try {
            // Extract thBuildId from the URL
            const thBuildId = extractThBuildId(url)
            if (!thBuildId) {
                toast.error('Could not find thBuildId in the provided URL')
                return
            }

            let credentials = await window.credentialsAPI.getBrowserStackAdminCredentials()
            if (!credentials) {
                credentials = await window.credentialsAPI.getBrowserStackDemoCredentials()
            }
            
            if (!credentials) {
                toast.error('Please configure your BrowserStack credentials first')
                return
            }
            
            const result = await window.browserstackAPI.getScannerSessionIds(thBuildId)
            setSessionData(result)
        } catch (error) {
            console.error('Error finding session:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to find session. Please check the URL and try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="p-6 rounded-box">
            <h2 className="text-lg font-bold mb-4">Session Finder</h2>
            <div className="flex gap-2">
                <div className="form-control flex-1">
                    <label className="label">
                        <span className="label-text">Website Scanner Accessibility Report URL</span>
                    </label>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="input input-bordered w-full placeholder-gray-300"
                        placeholder="https://scanner.browserstack.com/site-scanner/..."
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleFindSession}
                        disabled={isLoading}
                        className="btn btn-neutral"
                    >
                        {isLoading ? (
                            <span className="loading loading-spinner"></span>
                        ) : (
                            'Find Session'
                        )}
                    </button>
                </div>
            </div>
            
            {sessionData && (
                <div className="mt-6">
                    <h3 className="text-md font-semibold mb-3">Session Results</h3>
                    <div className="bg-base-200 rounded-lg p-4">
                        
                        {sessionData.data && Object.keys(sessionData.data as Record<string, string[]>).length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Automate Session:</h4>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {Object.entries(sessionData.data as Record<string, string[]>).map(([thBuildId, sessionArray]: [string, string[]]) => (
                                        <div key={thBuildId} className="mb-4">
                                            <div className="text-sm font-medium mb-2 opacity-70">
                                                TestHub Build ID: {thBuildId}
                                            </div>
                                            {Array.isArray(sessionArray) && sessionArray.map((sessionId: string, index: number) => (
                                                <div
                                                    key={index}
                                                    onClick={() => window.electronAPI.openExternalUrl(`https://automate.browserstack.com/dashboard/v2/sessions/${sessionId}`)}
                                                    className="block bg-base-100 rounded p-3 text-sm font-mono hover:bg-base-300 transition-colors cursor-pointer"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span>Automate Session ID: {sessionId}</span>
                                                        <span className="text-xs opacity-60">Open in Browser →</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}