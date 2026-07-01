/** Xuất preview bảng HTML cho Word — giữ logic V3.html */

export function generateLatexTableHtml(tree) {
  if (!tree || !tree.root) return '';

  const calcWidth = (n) => {
    if (!n.children || n.children.length === 0) {
      n.width = 1;
      return 1;
    }
    let w = 0;
    n.children.forEach((c) => {
      w += calcWidth(c);
    });
    n.width = w;
    return w;
  };
  const totalCols = calcWidth(tree.root);

  const calcDepth = (n, d) => {
    n.depth = d;
    let md = d;
    if (n.children && n.children.length > 0) {
      n.children.forEach((c) => {
        md = Math.max(md, calcDepth(c, d + 1));
      });
    }
    return md;
  };
  const maxDepth = calcDepth(tree.root, 0);

  let html = `<div style="font-family: Arial, sans-serif; text-align: center; color: #000;">`;
  html += `<h3 style="font-size: 14pt; font-weight: bold; margin-bottom: 20px;">SƠ ĐỒ: ${tree.title}</h3>`;
  html += `<table width="100%" style="width: 100%; border-collapse: collapse; border: none; margin: 0 auto; text-align: center;">`;

  let currentLevelQueue = [{ node: tree.root, width: tree.root.width }];

  for (let d = 0; d <= maxDepth; d++) {
    html += `<tr>`;
    const nextLevelQueue = [];

    currentLevelQueue.forEach((item) => {
      if (item.node) {
        let text = item.node.text.replace(/\n/g, '<br/>');

        if (
          item.node.type === 'given' &&
          !text.toLowerCase().includes('giả thiết') &&
          !text.toLowerCase().includes('đề bài')
        ) {
          text += ' (giả thiết)';
        }

        let boxStyle = `border: 1.5px solid #6366f1; padding: 10px 15px; border-radius: 10px; display: inline-block; text-align: left; background-color: #f8fafc; font-size: 12pt; margin: 0 5px;`;
        if (item.node.type === 'goal') {
          boxStyle = `border: 2px solid #ef4444; padding: 12px 18px; border-radius: 10px; display: inline-block; text-align: center; background-color: #fef2f2; font-size: 13pt; font-weight: bold; color: #991b1b; margin: 0 5px;`;
        } else if (item.node.type === 'given') {
          boxStyle = `border: 1.5px solid #10b981; padding: 10px 15px; border-radius: 10px; display: inline-block; text-align: left; background-color: #ecfdf5; font-size: 12pt; margin: 0 5px;`;
        }

        html += `<td colspan="${item.width}" style="padding: 10px 5px; border: none; vertical-align: bottom; text-align: center; width: ${(item.width / totalCols) * 100}%">
                                        <div style="${boxStyle}">${text}</div>
                                     </td>`;

        if (item.node.children && item.node.children.length > 0) {
          item.node.children.forEach((child) => {
            nextLevelQueue.push({ node: child, width: child.width });
          });
        } else {
          nextLevelQueue.push({ node: null, width: item.width });
        }
      } else {
        html += `<td colspan="${item.width}" style="border: none; width: ${(item.width / totalCols) * 100}%"></td>`;
        nextLevelQueue.push({ node: null, width: item.width });
      }
    });
    html += `</tr>`;

    if (d < maxDepth) {
      html += `<tr>`;
      nextLevelQueue.forEach((item) => {
        if (item.node) {
          html += `<td colspan="${item.width}" style="padding: 2px; border: none; text-align: center; vertical-align: middle;">
                                            <span style="font-size: 24pt; color: #ef4444; font-weight: bold;">&uarr;</span>
                                         </td>`;
        } else {
          html += `<td colspan="${item.width}" style="border: none;"></td>`;
        }
      });
      html += `</tr>`;
    }

    currentLevelQueue = nextLevelQueue;
  }

  html += `</table></div>`;
  return html;
}
