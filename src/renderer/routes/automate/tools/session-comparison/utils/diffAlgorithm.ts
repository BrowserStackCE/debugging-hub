import { CharDiff, DiffLine } from '../types';

export function generateCharDiffs(oldText: string, newText: string): CharDiff[] {
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
  
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  const wordSimilarity = commonWords / totalWords;
  
  const editDistance = levenshteinDistance(str1, str2);
  const charSimilarity = (longer.length - editDistance) / longer.length;
  
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

export function generateDiff(oldValue: string, newValue: string): DiffLine[] {
  const oldLines = oldValue.split('\n');
  const newLines = newValue.split('\n');
  const result: DiffLine[] = [];
  
  let leftNum = 1;
  let rightNum = 1;
  let i = 0;
  let j = 0;
  
  const getLookaheadMatch = (oldIdx: number, newIdx: number, range: number = 10) => {
    let bestMatch = { oldIdx: -1, newIdx: -1, similarity: 0.3 };
    
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
    if (i >= oldLines.length && j >= newLines.length) break;
    
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
    
    const currentOld = oldLines[i];
    const currentNew = newLines[j];
    
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
    
    const currentSimilarity = calculateSimilarity(currentOld, currentNew);
    const lookahead = getLookaheadMatch(i, j, 10);
    
    const shouldPairCurrent = 
      currentSimilarity > 0.3 && 
      (lookahead.similarity - currentSimilarity < 0.2 || 
       (lookahead.oldIdx === i && lookahead.newIdx === j));
    
    if (shouldPairCurrent) {
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
      result.push({
        type: 'removed',
        leftLine: currentOld,
        rightLine: null,
        leftNumber: leftNum++,
        rightNumber: null
      });
      i++;
    } else if (lookahead.newIdx > j && lookahead.oldIdx === i) {
      result.push({
        type: 'added',
        leftLine: null,
        rightLine: currentNew,
        leftNumber: null,
        rightNumber: rightNum++
      });
      j++;
    } else {
      let oldHasBetterMatch = false;
      let newHasBetterMatch = false;
      
      for (let k = j + 1; k < Math.min(j + 5, newLines.length); k++) {
        if (calculateSimilarity(currentOld, newLines[k]) > currentSimilarity + 0.2) {
          oldHasBetterMatch = true;
          break;
        }
      }
      
      for (let k = i + 1; k < Math.min(i + 5, oldLines.length); k++) {
        if (calculateSimilarity(oldLines[k], currentNew) > currentSimilarity + 0.2) {
          newHasBetterMatch = true;
          break;
        }
      }
      
      if (newHasBetterMatch && !oldHasBetterMatch) {
        result.push({
          type: 'added',
          leftLine: null,
          rightLine: currentNew,
          leftNumber: null,
          rightNumber: rightNum++
        });
        j++;
      } else if (oldHasBetterMatch && !newHasBetterMatch) {
        result.push({
          type: 'removed',
          leftLine: currentOld,
          rightLine: null,
          leftNumber: leftNum++,
          rightNumber: null
        });
        i++;
      } else {
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
