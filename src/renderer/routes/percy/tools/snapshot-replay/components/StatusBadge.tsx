interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'bg-green-500';
            case 'starting': return 'bg-yellow-500';
            case 'terminated': return 'bg-gray-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };
    
    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
            <span className="text-sm font-medium capitalize">{status}</span>
        </div>
    );
}
