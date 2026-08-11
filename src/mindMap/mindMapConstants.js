/** Dữ liệu mẫu & hằng số — đồng bộ với sơ đồ tư duy V3.html */

export const COLLECTION_MINDMAP_G9 = 'math_mindmap_geometry9_v1';

export function resolveMindMapGradeLevel(raw) {
  return String(raw?.grade_level || '9').trim();
}

/** Lọc chuyên đề theo khối; grade = ALL hoặc rỗng → trả về toàn bộ. */
export function filterMindMapCategoriesByGrade(categories, grade) {
  const g = String(grade || '').trim();
  if (!g || g === 'ALL') return [...(categories || [])];
  return (categories || []).filter((c) => resolveMindMapGradeLevel(c) === g);
}

export function mindMapGradeForAdmin(activeGrade, draftGradeLevel) {
  const active = String(activeGrade || '').trim();
  if (active && active !== 'ALL') return active;
  return resolveMindMapGradeLevel({ grade_level: draftGradeLevel });
}

export const DEFAULT_IMPORT_TEXT_FULL = `PROBLEM_TITLE: Câu 7: (Cụm 11- Đề 1)
PROBLEM_CONTENT: 
Cho tam giác $ABC$ nhọn ($AB>AC$). Vẽ đường tròn tâm $O$ đường kính $AB$ cắt các cạnh $BC$, $AC$ lần lượt tại $D$, $E$. Gọi $H$ là giao điểm của $AD$ và $BE$.

# Lời giải từng ý: SOLUTION_FOR: + cùng cụm với TREE_TITLE (còn SOLUTION_CONTENT: chỉ gán ý đầu — cách cũ)

SOLUTION_FOR: Câu a: Chứng minh tứ giác CEHD nội tiếp
Ta có $\\widehat{CEH} = 90^\\circ$, $\\widehat{CDH} = 90^\\circ$ (góc nội tiếp chắn nửa đường tròn). Suy ra tổng hai góc đối diện $180^\\circ$ nên $CEHD$ nội tiếp.

SOLUTION_FOR: Câu b.1: Chứng minh ΔHNC ∼ ΔBCA
(Ví dụ lời giải cho ý b.1 — nhập đầy đủ khi soạn bài.)

TREE_TITLE: Câu a: Chứng minh tứ giác CEHD nội tiếp
[GOAL] Tứ giác $CEHD$ nội tiếp
[NEED 1] $\\widehat{CEH} + \\widehat{CDH} = 180^\\circ$
[GIVEN 1.1] $\\widehat{CEH} = 90^\\circ$ (Do $E$ thuộc đường kính $AB$)
[GIVEN 1.2] $\\widehat{CDH} = 90^\\circ$ (Do $D$ thuộc đường kính $AB$)

TREE_TITLE: Câu b.1: Chứng minh ΔHNC ∼ ΔBCA
[GOAL] $\\Delta HNC \\sim \\Delta BCA$ (g.g)
[NEED 1] $\\widehat{CHN} = \\widehat{CBA}$ và $\\widehat{NCH} = \\widehat{CAB}$
[NEED 1.1] $\\widehat{CHN} = \\widehat{CBA}$
[GIVEN 1.1.1] MCNH là hình bình hành suy ra $HN \\parallel CE$`;

export const INITIAL_PROBLEM = {
  title: 'Câu 7: (Cụm 11- Đề 1)',
  content:
    'Cho tam giác $ABC$ nhọn ($AB>AC$). Vẽ đường tròn tâm $O$ đường kính $AB$ cắt các cạnh $BC$, $AC$ lần lượt tại $D$, $E$. Gọi $H$ là giao điểm của $AD$ và $BE$.\n\na) Chứng minh tứ giác $CEHD$ nội tiếp.\n\nb) Từ $C$ vẽ đường thẳng song song với $AD$ cắt $BE$ tại $M$, vẽ đường thẳng song song với $BE$ cắt $AD$ tại $N$. Chứng minh $\\Delta HNC \\sim \\Delta BCA$ và $OC \\perp MN$.\n\nc) $CH$ cắt $AB$ tại $F$. Tính diện tích $\\Delta ABC$ khi $FA=6cm, FB=15cm, FH=5cm$.',
  imageUrl: null,
};

export const INITIAL_LOGIC_TREES = [
  {
    id: 'q1',
    title: 'Câu a: Chứng minh tứ giác CEHD nội tiếp',
    imageUrl: null,
    useOwnFigure: false,
    imageCaption: '',
    horizontalSpacing: 16,
    solutionText: '',
    root: {
      id: 'n1',
      type: 'goal',
      text: 'Tứ giác $CEHD$ nội tiếp',
      children: [
        {
          id: 'n2',
          type: 'need',
          text: '$\\widehat{CEH} + \\widehat{CDH} = 180^\\circ$',
          children: [
            {
              id: 'n3',
              type: 'given',
              text: '$\\widehat{CEH} = 90^\\circ$\n(Do $E$ thuộc đường tròn đường kính $AB$)',
            },
            {
              id: 'n4',
              type: 'given',
              text: '$\\widehat{CDH} = 90^\\circ$\n(Do $D$ thuộc đường tròn đường kính $AB$)',
            },
          ],
        },
      ],
    },
  },
];

export function newExerciseDraft(order) {
  const n = Number(order) || 1;
  return {
    id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: `Bài ${n}`,
    /** Một URL ảnh dùng chung cho các ý (khi ý đó không bật ảnh riêng). */
    sharedMindMapImageUrl: null,
    problem: { ...INITIAL_PROBLEM },
    logicTrees: JSON.parse(JSON.stringify(INITIAL_LOGIC_TREES)),
  };
}

export function newCategoryDraft(sortOrder) {
  return {
    title: 'Chuyên đề Hình học mới',
    sort_order: sortOrder,
    exercises: [newExerciseDraft(1)],
  };
}
