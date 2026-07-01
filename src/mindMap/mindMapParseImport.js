/**
 * Parser Import TXT — [GOAL]/[NEED]/[GIVEN], PROBLEM_*, SOLUTION_CONTENT (legacy),
 * SOLUTION_FOR: (lời giải theo từng TREE_TITLE), TREE_TITLE
 */

export function normTitle(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.:;,]+$/g, '')
    .toLowerCase();
}

/** Khớp tiêu đề TREE_TITLE với phần sau SOLUTION_FOR: (linh hoạt). */
export function titlesMatch(treeTitle, blockTitleKey) {
  const a = normTitle(treeTitle);
  const b = normTitle(blockTitleKey);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

/**
 * Trích các khối:
 *   SOLUTION_FOR: <cùng cụm với TREE_TITLE, ví dụ Câu a: Chứng minh...>
 *   ...nội dung nhiều dòng...
 */
export function extractSolutionForBlocks(importText) {
  const lines = importText.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const m = t.match(/^SOLUTION_FOR:\s*(.+)$/i);
    if (!m) continue;
    const titleKey = m[1].trim();
    i += 1;
    const body = [];
    while (i < lines.length) {
      const lt = lines[i].trim();
      if (
        /^SOLUTION_FOR:/i.test(lt) ||
        /^TREE_TITLE:/i.test(lt) ||
        /^PROBLEM_TITLE:/i.test(lt) ||
        /^PROBLEM_CONTENT:/i.test(lt) ||
        /^SOLUTION_CONTENT:/i.test(lt)
      ) {
        i -= 1;
        break;
      }
      body.push(lines[i]);
      i += 1;
    }
    blocks.push({ titleKey, text: body.join('\n').trim() });
  }
  return blocks;
}

/**
 * Gắn lời giải vào từng cây. Legacy: nếu không có SOLUTION_FOR mà có SOLUTION_CONTENT thì gán cây đầu.
 */
export function attachSolutionsToTrees(trees, importText, legacySolution, hasLegacySolutionBlock) {
  const blocks = extractSolutionForBlocks(importText);
  return trees.map((tree, idx) => {
    const hit = blocks.find((bl) => titlesMatch(tree.title, bl.titleKey));
    let solutionText = hit ? hit.text : typeof tree.solutionText === 'string' ? tree.solutionText : '';
    if (!hit && blocks.length === 0 && idx === 0 && hasLegacySolutionBlock && String(legacySolution || '').trim()) {
      solutionText = String(legacySolution).trim();
    }
    return { ...tree, solutionText };
  });
}

export function parseMindMapImportText(importText) {
  const lines = importText.split(/\r?\n/);
  let newTitle = null;
  let newContent = '';
  let newSolution = '';
  let hasSolutionBlock = false;
  let isParsingContent = false;
  let isParsingSolution = false;

  let currentTree = null;
  const newTrees = [];
  let stack = [];

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const trimmedLine = originalLine.trim();

    if (trimmedLine.toUpperCase().startsWith('PROBLEM_TITLE:')) {
      isParsingContent = false;
      isParsingSolution = false;
      newTitle = trimmedLine.substring('PROBLEM_TITLE:'.length).trim();
      continue;
    }

    if (trimmedLine.toUpperCase().startsWith('PROBLEM_CONTENT:')) {
      isParsingSolution = false;
      newContent = trimmedLine.substring('PROBLEM_CONTENT:'.length).trim() + '\n';
      isParsingContent = true;
      continue;
    }

    if (trimmedLine.toUpperCase().startsWith('SOLUTION_CONTENT:')) {
      hasSolutionBlock = true;
      isParsingContent = false;
      isParsingSolution = true;
      newSolution = trimmedLine.substring('SOLUTION_CONTENT:'.length).trim() + '\n';
      continue;
    }

    if (trimmedLine.toUpperCase().startsWith('TREE_TITLE:')) {
      isParsingContent = false;
      isParsingSolution = false;
      if (currentTree && currentTree.root) {
        newTrees.push(currentTree);
      }
      currentTree = {
        id: `q${Date.now()}_${i}`,
        title: trimmedLine.substring('TREE_TITLE:'.length).trim(),
        imageUrl: null,
        useOwnFigure: false,
        imageCaption: '',
        horizontalSpacing: 16,
        solutionText: '',
        root: null,
      };
      stack = [];
      continue;
    }

    if (isParsingSolution) {
      if (
        trimmedLine.toUpperCase().startsWith('PROBLEM_TITLE:') ||
        trimmedLine.toUpperCase().startsWith('PROBLEM_CONTENT:') ||
        trimmedLine.toUpperCase().startsWith('SOLUTION_CONTENT:')
      ) {
        isParsingSolution = false;
        i -= 1;
        continue;
      }
      if (trimmedLine !== '' || newSolution !== '') {
        newSolution += originalLine + '\n';
      }
      continue;
    }

    if (isParsingContent && !trimmedLine.match(/^(?:[-*]\s*)?(>*)\s*\[(GOAL|NEED|GIVEN)/i)) {
      if (trimmedLine.toUpperCase().startsWith('SOLUTION_CONTENT:')) {
        hasSolutionBlock = true;
        isParsingContent = false;
        isParsingSolution = true;
        newSolution = trimmedLine.substring('SOLUTION_CONTENT:'.length).trim() + '\n';
        continue;
      }
      if (trimmedLine !== '' || newContent !== '') {
        newContent += originalLine + '\n';
      }
      continue;
    }

    let cleanLine = trimmedLine.replace(/^[-*]\s*/, '');

    const contentMatch = cleanLine.match(/^(>*)\s*\[(GOAL|NEED|GIVEN)\s*([0-9\.]*)\]\s*(.*)/i);

    if (contentMatch) {
      isParsingContent = false;
      isParsingSolution = false;

      const arrowDepth = contentMatch[1].length;
      const type = contentMatch[2].toLowerCase();
      let numbering = contentMatch[3].trim();
      if (numbering.endsWith('.')) numbering = numbering.slice(0, -1);

      const text = contentMatch[4].trim();
      const newNode = {
        id: `n_${Date.now()}_${Math.random()}`,
        type,
        text,
        children: [],
        // Học sinh: mặc định chỉ hiện MỤC TIÊU; các ô dưới sẽ "đóng" trừ khi giáo viên mở.
        hiddenDefault: type === 'goal' ? false : true,
      };

      if (!currentTree) {
        currentTree = {
          id: `q${Date.now()}_default`,
          title: 'Sơ đồ Nhập nhanh',
          imageUrl: null,
          useOwnFigure: false,
          imageCaption: '',
          horizontalSpacing: 16,
          solutionText: '',
          root: null,
        };
      }

      if (type === 'goal') {
        if (currentTree.root) throw new Error('Lỗi: Mỗi nhánh chỉ có 1 [GOAL] cao nhất.');
        currentTree.root = newNode;
        stack = [{ depth: 0, node: currentTree.root }];
      } else {
        if (!currentTree.root) throw new Error('Dòng đầu tiên của nhánh bắt buộc là [GOAL].');

        let depth = 0;
        if (arrowDepth > 0) {
          depth = arrowDepth;
        } else if (numbering !== '') {
          depth = numbering.split('.').length;
        } else {
          throw new Error(
            `Dòng này thiếu định vị phân cấp. Vui lòng thêm số chỉ mục (VD: [NEED 1], [GIVEN 1.1]) hoặc dấu '>' vào trước:\n-> ${cleanLine}`
          );
        }

        while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
          stack.pop();
        }

        if (stack.length === 0) {
          throw new Error(`Lỗi cấu trúc logic: Không tìm thấy ý cha cho dòng này:\n-> ${cleanLine}`);
        }

        stack[stack.length - 1].node.children.push(newNode);
        stack.push({ depth, node: newNode });
      }
    }
  }

  if (currentTree && currentTree.root) {
    newTrees.push(currentTree);
  }

  return {
    newTitle,
    newContent: newContent.trim(),
    newSolution: newSolution.trim(),
    newTrees,
    hasSolutionBlock,
  };
}
