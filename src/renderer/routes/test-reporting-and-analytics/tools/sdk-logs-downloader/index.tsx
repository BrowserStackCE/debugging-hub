import React, { useState } from 'react';

export default function SDKLogsDownloader() {
  const [buildId, setBuildId] = useState('');

  const handleGetLogs = () => {
    if (!buildId.trim()) {
      alert('Please enter a TestHub build ID');
      return;
    }
    
    const url = `https://www.browserstack.com/admin/testhub_sdk_logs?build_id=${buildId}`;
    // Open in default browser using Electron API
    window.electronAPI.openExternalUrl(url);
  };

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-2xl font-bold mb-4">SDK Logs Downloader</h1>
      
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-2">TestHub Build ID</label>
          <input
            type="text"
            value={buildId}
            onChange={(e) => setBuildId(e.target.value)}
            placeholder="Enter TestHub build ID"
            className="input placeholder-gray-300 w-80"
          />
        </div>
        
        <button
          onClick={handleGetLogs}
          className="btn btn-neutral"
        >
          Get SDK Logs
          <svg
            className="w-4 h-4 transform rotate-45"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}