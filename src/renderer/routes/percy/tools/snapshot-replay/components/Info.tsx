interface InfoProps {
    label: string;
    value?: string;
    children?: React.ReactNode;
}

export default function Info({ label, value, children }: InfoProps) {
    return (
        <div className="flex flex-col bg-base-200 rounded-lg p-3">
            <span className="text-xs text-base-content/70 uppercase tracking-wide">{label}</span>
            <span title={typeof value === 'string' ? value : ''} className="font-medium text-base-content truncate text-ellipsis">
                {children || (typeof value === 'string' ? value : '')}
            </span>
        </div>
    );
}
