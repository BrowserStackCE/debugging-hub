import { useMemo, useState, useEffect } from 'react';
import { DiffLine } from '../types';
import { generateDiff } from '../utils/diffAlgorithm';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  leftTitle: string;
  rightTitle: string;
  batchSize?: number;
}

function LineContent({ line, side }: { line: DiffLine; side: 'left' | 'right' }) {
  const content = side === 'left' ? line.leftLine : line.rightLine;
  
  if (content === null) return <span className="text-gray-400">—</span>;
  if (content === '') return <span className="text-gray-300">∅</span>;
  
  if (line.type === 'modified' && line.charDiffs) {
    return (
      <span>
        {line.charDiffs.map((diff, idx) => {
          if (diff.type === 'common') {
            return <span key={idx}>{diff.text}</span>;
          } else if (diff.type === 'removed' && side === 'left') {
            return (
              <span key={idx} className="bg-red-200 text-red-900 font-semibold">
                {diff.text}
              </span>
            );
          } else if (diff.type === 'added' && side === 'right') {
            return (
              <span key={idx} className="bg-green-200 text-green-900 font-semibold">
                {diff.text}
              </span>
            );
          }
          return null;
        })}
      </span>
    );
  }
  
  return <span>{content}</span>;
}

export default function DiffViewer({
  oldValue,
  newValue,
  leftTitle,
  rightTitle,
  batchSize = 200
}: DiffViewerProps) {
  const allDiffLines = useMemo(() => {
    return generateDiff(oldValue, newValue);
  }, [oldValue, newValue]);
  
  const [renderLimit, setRenderLimit] = useState(batchSize);
  
  useEffect(() => {
    setRenderLimit(batchSize);
  }, [oldValue, newValue, batchSize]);
  
  const visibleLines = allDiffLines.slice(0, renderLimit);
  const remainingLines = allDiffLines.length - renderLimit;
  
  const handleLoadMore = () => {
    setRenderLimit((prev) => Math.min(prev + batchSize, allDiffLines.length));
  };
  
  const handleLoadAll = () => {
    setRenderLimit(allDiffLines.length);
  };
  
  const getLineStyle = (type: DiffLine['type'], side: 'left' | 'right') => {
    if (type === 'unchanged') return 'bg-white';
    if (type === 'removed' && side === 'left') return 'bg-red-50';
    if (type === 'added' && side === 'right') return 'bg-green-50';
    if (type === 'modified') return side === 'left' ? 'bg-orange-50' : 'bg-blue-50';
    if (type === 'removed' && side === 'right') return 'bg-gray-50';
    if (type === 'added' && side === 'left') return 'bg-gray-50';
    return 'bg-white';
  };
  
  const getIndicator = (type: DiffLine['type'], side: 'left' | 'right') => {
    if (type === 'unchanged') return '•';
    if (type === 'removed' && side === 'left') return '−';
    if (type === 'added' && side === 'right') return '+';
    if (type === 'modified') return '~';
    return '•';
  };
  
  return (
    <div className="flex flex-col h-full border border-gray-300 rounded-lg overflow-hidden bg-white">
      <div className="grid grid-cols-2 border-b border-gray-300 bg-gray-50 sticky top-0 z-10">
        <div className="px-4 py-2 font-semibold border-r border-gray-300">
          {leftTitle}
        </div>
        <div className="px-4 py-2 font-semibold">
          {rightTitle}
        </div>
      </div>

      <div className="overflow-auto flex-1">
        {visibleLines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-2 border-b border-gray-200 hover:bg-gray-50">
            <div className={`flex ${getLineStyle(line.type, 'left')} border-r border-gray-200`}>
              <div className="w-12 flex-shrink-0 text-right pr-2 py-1 text-xs text-gray-500 bg-gray-50 border-r border-gray-200 select-none">
                {line.leftNumber || ''}
              </div>
              <div className="w-8 flex-shrink-0 text-center py-1 text-xs font-bold select-none">
                {getIndicator(line.type, 'left')}
              </div>
              <div className="flex-1 px-2 py-1 font-mono text-sm whitespace-pre-wrap break-all">
                <LineContent line={line} side="left" />
              </div>
            </div>

            <div className={`flex ${getLineStyle(line.type, 'right')}`}>
              <div className="w-12 flex-shrink-0 text-right pr-2 py-1 text-xs text-gray-500 bg-gray-50 border-r border-gray-200 select-none">
                {line.rightNumber || ''}
              </div>
              <div className="w-8 flex-shrink-0 text-center py-1 text-xs font-bold select-none">
                {getIndicator(line.type, 'right')}
              </div>
              <div className="flex-1 px-2 py-1 font-mono text-sm whitespace-pre-wrap break-all">
                <LineContent line={line} side="right" />
              </div>
            </div>
          </div>
        ))}

        {remainingLines > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-300">
            <div className="text-sm text-gray-600 mb-2">
              Showing {renderLimit.toLocaleString()} of {allDiffLines.length.toLocaleString()} lines.
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLoadMore}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Load next {batchSize} lines
              </button>
              {remainingLines < 5000 && (
                <button
                  onClick={handleLoadAll}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                  Load Remaining ({remainingLines})
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 border-t border-gray-300 bg-gray-50 text-xs">
        <div className="px-4 py-2 border-r border-gray-300 flex gap-4">
          <span className="flex items-center gap-1">
            <span className="font-bold">−</span> Removed
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold">~</span> Modified
          </span>
        </div>
        <div className="px-4 py-2 flex gap-4">
          <span className="flex items-center gap-1">
            <span className="font-bold">+</span> Added
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold">~</span> Modified
          </span>
        </div>
      </div>
    </div>
  );
}
