export interface DiffLine {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  leftLine?: string;
  rightLine?: string;
  leftNumber?: number;
  rightNumber?: number;
  charDiffs?: Array<{ type: 'added' | 'removed' | 'common'; text: string }>;
}

function getCharDiff(oldStr: string, newStr: string): Array<{ type: 'added' | 'removed' | 'common'; text: string }> {
  const result: Array<{ type: 'added' | 'removed' | 'common'; text: string }> = [];

  const oldChars = oldStr.split('');
  const newChars = newStr.split('');

  const matrix: number[][] = Array(oldChars.length + 1)
    .fill(0)
    .map(() => Array(newChars.length + 1).fill(0));

  for (let i = 0; i <= oldChars.length; i++) {
    for (let j = 0; j <= newChars.length; j++) {
      if (i === 0 || j === 0) {
        matrix[i][j] = 0;
      } else if (oldChars[i - 1] === newChars[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  let i = oldChars.length;
  let j = newChars.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldChars[i - 1] === newChars[j - 1]) {
      result.unshift({ type: 'common', text: oldChars[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      result.unshift({ type: 'added', text: newChars[j - 1] });
      j--;
    } else if (i > 0) {
      result.unshift({ type: 'removed', text: oldChars[i - 1] });
      i--;
    }
  }

  const merged: Array<{ type: 'added' | 'removed' | 'common'; text: string }> = [];
  for (const item of result) {
    if (merged.length > 0 && merged[merged.length - 1].type === item.type) {
      merged[merged.length - 1].text += item.text;
    } else {
      merged.push({ ...item });
    }
  }

  return merged;
}

export function generateDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const result: DiffLine[] = [];

  const matrix: number[][] = Array(oldLines.length + 1)
    .fill(0)
    .map(() => Array(newLines.length + 1).fill(0));

  for (let i = 0; i <= oldLines.length; i++) {
    for (let j = 0; j <= newLines.length; j++) {
      if (i === 0 || j === 0) {
        matrix[i][j] = 0;
      } else if (oldLines[i - 1] === newLines[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  let i = oldLines.length;
  let j = newLines.length;
  let oldLineNum = oldLines.length;
  let newLineNum = newLines.length;

  const tempResult: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      tempResult.unshift({
        type: 'unchanged',
        leftLine: oldLines[i - 1],
        rightLine: newLines[j - 1],
        leftNumber: oldLineNum,
        rightNumber: newLineNum
      });
      i--;
      j--;
      oldLineNum--;
      newLineNum--;
    } else if (i > 0 && j > 0 && oldLines[i - 1] !== newLines[j - 1]) {
      const charDiffs = getCharDiff(oldLines[i - 1], newLines[j - 1]);
      tempResult.unshift({
        type: 'modified',
        leftLine: oldLines[i - 1],
        rightLine: newLines[j - 1],
        leftNumber: oldLineNum,
        rightNumber: newLineNum,
        charDiffs
      });
      i--;
      j--;
      oldLineNum--;
      newLineNum--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      tempResult.unshift({
        type: 'added',
        rightLine: newLines[j - 1],
        rightNumber: newLineNum
      });
      j--;
      newLineNum--;
    } else if (i > 0) {
      tempResult.unshift({
        type: 'removed',
        leftLine: oldLines[i - 1],
        leftNumber: oldLineNum
      });
      i--;
      oldLineNum--;
    }
  }

  return tempResult;
}