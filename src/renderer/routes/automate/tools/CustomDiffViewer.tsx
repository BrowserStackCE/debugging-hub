import { useMemo, useState, useEffect } from 'react';

interface CharDiff {
  type: 'common' | 'removed' | 'added';
  text: string;
}

interface DiffLine {
  type: 'unchanged' | 'removed' | 'added' | 'modified';
  leftLine: string | null;
  rightLine: string | null;
  leftNumber: number | null;
  rightNumber: number | null;
  charDiffs?: CharDiff[];
}

function generateCharDiffs(oldText: string, newText: string): CharDiff[] {
  const diffs: CharDiff[] = [];
  let i = 0, j = 0;
  
  while (i < oldText.length || j < newText.length) {
    let commonStart = 0;
    while (i + commonStart < oldText.length && 
           j + commonStart < newText.length && 
           oldText[i + commonStart] === newText[j + commonStart]) {
      commonStart++;
    }
    
    if (commonStart > 0) {
      diffs.push({ type: 'common', text: oldText.slice(i, i + commonStart) });
      i += commonStart;
      j += commonStart;
      continue;
    }
    
    let oldNext = i;
    let newNext = j;
    let found = false;
    
    for (let lookAhead = 1; lookAhead <= Math.min(50, Math.max(oldText.length - i, newText.length - j)); lookAhead++) {
      if (i + lookAhead < oldText.length && j < newText.length && oldText[i + lookAhead] === newText[j]) {
        oldNext = i + lookAhead;
        newNext = j;
        found = true;
        break;
      }
      if (j + lookAhead < newText.length && i < oldText.length && newText[j + lookAhead] === oldText[i]) {
        oldNext = i;
        newNext = j + lookAhead;
        found = true;
        break;
      }
    }
    
    if (!found) {
      oldNext = Math.min(i + 1, oldText.length);
      newNext = Math.min(j + 1, newText.length);
    }
    
    if (i < oldNext) {
      diffs.push({ type: 'removed', text: oldText.slice(i, oldNext) });
      i = oldNext;
    }
    if (j < newNext) {
      diffs.push({ type: 'added', text: newText.slice(j, newNext) });
      j = newNext;
    }
  }
  
  return diffs;
}

function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Quick structural similarity check
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  const wordSimilarity = commonWords / totalWords;
  
  // Character-level similarity
  const editDistance = levenshteinDistance(str1, str2);
  const charSimilarity = (longer.length - editDistance) / longer.length;
  
  // Weighted average favoring word similarity
  return wordSimilarity * 0.7 + charSimilarity * 0.3;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function generateDiff(oldValue: string, newValue: string): DiffLine[] {
  const oldLines = oldValue.split('\n');
  const newLines = newValue.split('\n');
  const result: DiffLine[] = [];
  
  let leftNum = 1;
  let rightNum = 1;
  let i = 0;
  let j = 0;
  
  // Precompute similarity matrix for lookahead
  const getLookaheadMatch = (oldIdx: number, newIdx: number, range: number = 10) => {
    let bestMatch = { oldIdx: -1, newIdx: -1, similarity: 0.3 };
    
    // Look ahead in both directions
    for (let oi = oldIdx; oi < Math.min(oldIdx + range, oldLines.length); oi++) {
      for (let ni = newIdx; ni < Math.min(newIdx + range, newLines.length); ni++) {
        if (oi === oldIdx && ni === newIdx) continue;
        const sim = calculateSimilarity(oldLines[oi], newLines[ni]);
        if (sim > bestMatch.similarity) {
          bestMatch = { oldIdx: oi, newIdx: ni, similarity: sim };
        }
      }
    }
    
    return bestMatch;
  };
  
  while (i < oldLines.length || j < newLines.length) {
    // Both exhausted
    if (i >= oldLines.length && j >= newLines.length) break;
    
    // Only old lines remain
    if (i < oldLines.length && j >= newLines.length) {
      result.push({
        type: 'removed',
        leftLine: oldLines[i],
        rightLine: null,
        leftNumber: leftNum++,
        rightNumber: null
      });
      i++;
      continue;
    }
    
    // Only new lines remain
    if (j < newLines.length && i >= oldLines.length) {
      result.push({
        type: 'added',
        leftLine: null,
        rightLine: newLines[j],
        leftNumber: null,
        rightNumber: rightNum++
      });
      j++;
      continue;
    }
    
    // Both lines exist
    const currentOld = oldLines[i];
    const currentNew = newLines[j];
    
    // Check if lines are identical
    if (currentOld === currentNew) {
      result.push({
        type: 'unchanged',
        leftLine: currentOld,
        rightLine: currentNew,
        leftNumber: leftNum++,
        rightNumber: rightNum++
      });
      i++;
      j++;
      continue;
    }
    
    // Calculate similarity for current pair
    const currentSimilarity = calculateSimilarity(currentOld, currentNew);
    
    // Look ahead to see if there are better matches
    const lookahead = getLookaheadMatch(i, j, 10);
    
    // Decide whether to pair current lines or skip
    const shouldPairCurrent = 
      currentSimilarity > 0.3 && 
      (lookahead.similarity - currentSimilarity < 0.2 || 
       (lookahead.oldIdx === i && lookahead.newIdx === j));
    
    if (shouldPairCurrent) {
      // Pair as modified
      const charDiffs = generateCharDiffs(currentOld, currentNew);
      result.push({
        type: 'modified',
        leftLine: currentOld,
        rightLine: currentNew,
        leftNumber: leftNum++,
        rightNumber: rightNum++,
        charDiffs
      });
      i++;
      j++;
    } else if (lookahead.oldIdx > i && lookahead.newIdx === j) {
      // Better match found in old lines, current old should be removed
      result.push({
        type: 'removed',
        leftLine: currentOld,
        rightLine: null,
        leftNumber: leftNum++,
        rightNumber: null
      });
      i++;
    } else if (lookahead.newIdx > j && lookahead.oldIdx === i) {
      // Better match found in new lines, current new should be added
      result.push({
        type: 'added',
        leftLine: null,
        rightLine: currentNew,
        leftNumber: null,
        rightNumber: rightNum++
      });
      j++;
    } else {
      // No clear winner, check which has a better forward match
      let oldHasBetterMatch = false;
      let newHasBetterMatch = false;
      
      // Check if current old line matches better with upcoming new lines
      for (let k = j + 1; k < Math.min(j + 5, newLines.length); k++) {
        if (calculateSimilarity(currentOld, newLines[k]) > currentSimilarity + 0.2) {
          oldHasBetterMatch = true;
          break;
        }
      }
      
      // Check if current new line matches better with upcoming old lines
      for (let k = i + 1; k < Math.min(i + 5, oldLines.length); k++) {
        if (calculateSimilarity(oldLines[k], currentNew) > currentSimilarity + 0.2) {
          newHasBetterMatch = true;
          break;
        }
      }
      
      if (newHasBetterMatch && !oldHasBetterMatch) {
        // Skip new line (add it)
        result.push({
          type: 'added',
          leftLine: null,
          rightLine: currentNew,
          leftNumber: null,
          rightNumber: rightNum++
        });
        j++;
      } else if (oldHasBetterMatch && !newHasBetterMatch) {
        // Skip old line (remove it)
        result.push({
          type: 'removed',
          leftLine: currentOld,
          rightLine: null,
          leftNumber: leftNum++,
          rightNumber: null
        });
        i++;
      } else {
        // When in doubt, pair them if they have ANY similarity
        if (currentSimilarity > 0.2) {
          const charDiffs = generateCharDiffs(currentOld, currentNew);
          result.push({
            type: 'modified',
            leftLine: currentOld,
            rightLine: currentNew,
            leftNumber: leftNum++,
            rightNumber: rightNum++,
            charDiffs
          });
          i++;
          j++;
        } else {
          // Completely different - remove old
          result.push({
            type: 'removed',
            leftLine: currentOld,
            rightLine: null,
            leftNumber: leftNum++,
            rightNumber: null
          });
          i++;
        }
      }
    }
  }
  
  return result;
}

interface CustomDiffViewerProps {
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

export default function CustomDiffViewer({
  oldValue,
  newValue,
  leftTitle,
  rightTitle,
  batchSize = 200
}: CustomDiffViewerProps) {
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