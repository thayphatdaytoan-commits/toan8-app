import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Code,
  Download,
  Edit2,
  FileText,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import MindMapMath from './MindMapMath';
import MindMapImagePanZoom from './MindMapImagePanZoom';
import MindMapTreeContainer from './MindMapTreeContainer';
import MindMapTreeNode from './MindMapTreeNode';
import { attachSolutionsToTrees, parseMindMapImportText } from './mindMapParseImport';
import { generateLatexTableHtml } from './mindMapWordExport';
import { mapTree, filterTree } from './mindMapTreeUtils';
import { DEFAULT_IMPORT_TEXT_FULL } from './mindMapConstants';
import {
  buildProblemImageStoragePath,
  buildSharedMindMapImageStoragePath,
  buildTreeImageStoragePath,
  uploadMindMapJpegToStorage,
} from './mindMapStorageUpload';

/** URL hiển thị cột Hình vẽ: ưu tiên ảnh chung bài, trừ khi ý bật ảnh riêng. */
function resolveTreeFigureUrl(tree, sharedUrl) {
  if (tree.useOwnFigure === true) return tree.imageUrl || null;
  if (sharedUrl) return sharedUrl;
  return tree.imageUrl || null;
}

export default function MindMapTeacherPanel({
  problem,
  setProblem,
  /** Ảnh hình một lần cho các ý (tiết kiệm Storage). */
  sharedMindMapImageUrl = null,
  setSharedMindMapImageUrl = () => {},
  logicTrees,
  setLogicTrees,
  isTeacherMode,
  /** Khi true: chỉ hiển thị các cây (dùng phía học sinh — đề bài đã hiện ở thẻ riêng). */
  hideProblemSection = false,
  /** Firebase Storage — chỉ giáo viên upload; học sinh không truyền. */
  storage = null,
  /** `{ categoryId, exerciseId }` để tạo đường dẫn file trong bucket */
  mindMapUploadContext = null,
}) {
  const mmUid = `${mindMapUploadContext?.categoryId ?? 'na'}_${mindMapUploadContext?.exerciseId ?? 'na'}`;
  const [editingProblem, setEditingProblem] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [isProblemCollapsed, setIsProblemCollapsed] = useState(false);
  /** Học sinh: từng cây chuyển cột phải giữa sơ đồ / lời giải (cột trái hình vẽ luôn giữ). */
  const [treeViewModes, setTreeViewModes] = useState({});
  const [uploadingTreeId, setUploadingTreeId] = useState(null);
  const [uploadingProblem, setUploadingProblem] = useState(false);
  const [uploadingSharedMindMap, setUploadingSharedMindMap] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState(DEFAULT_IMPORT_TEXT_FULL);
  const [importError, setImportError] = useState('');

  const [showLatexModal, setShowLatexModal] = useState(false);
  const [latexTableHtml, setLatexTableHtml] = useState('');

  const exportToImage = async (treeId, treeTitle) => {
    const element = document.getElementById(`tree-render-${treeId}`);
    if (!element) return;

    const originalStyle = {
      transform: element.style.transform,
      backgroundColor: element.style.backgroundColor,
    };

    element.style.transform = 'translate(0px, 0px) scale(1)';
    element.style.backgroundColor = '#f8fafc';

    try {
      await new Promise((r) => setTimeout(r, 100));
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `So_Do_${treeTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert(`Lỗi khi tạo ảnh: ${err.message}`);
    } finally {
      element.style.transform = originalStyle.transform;
      element.style.backgroundColor = originalStyle.backgroundColor;
    }
  };

  const copyTableToWord = () => {
    const tableDiv = document.getElementById('latex-export-table');
    if (!tableDiv) return;

    try {
      const range = document.createRange();
      range.selectNode(tableDiv);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);

      document.execCommand('copy');

      window.getSelection().removeAllRanges();
      alert('Đã copy Sơ đồ dạng Bảng chuẩn. Thầy hãy mở Word và nhấn Ctrl + V để dán nhé!');
    } catch {
      alert('Trình duyệt chặn quyền copy. Thầy vui lòng bôi đen toàn bộ bảng bên dưới và ấn Ctrl+C nhé!');
    }
  };

  const handleTextFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setImportText(content);
      setImportError('');
      setShowImportModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const processImportText = (isOverwrite) => {
    setImportError('');
    try {
      const { newTitle, newContent, newSolution, newTrees, hasSolutionBlock } = parseMindMapImportText(importText);
      const withSolutions = (trees) => attachSolutionsToTrees(trees, importText, newSolution, hasSolutionBlock);

      if (isOverwrite) {
        setProblem((p) => {
          const base = p && typeof p === 'object' ? p : { title: '', content: '', imageUrl: null };
          return {
            ...base,
            ...(newTitle !== null ? { title: newTitle } : {}),
            ...(newContent.trim() !== '' ? { content: newContent.trim() } : {}),
          };
        });
        setLogicTrees(withSolutions(newTrees));
      } else {
        if (newTitle !== null || newContent.trim() !== '') {
          setProblem((p) => {
            const base = p && typeof p === 'object' ? p : { title: '', content: '', imageUrl: null };
            return {
              ...base,
              ...(newTitle !== null ? { title: newTitle } : {}),
              ...(newContent.trim() !== '' ? { content: newContent.trim() } : {}),
            };
          });
        }
        if (newTrees.length > 0) setLogicTrees([...logicTrees, ...withSolutions(newTrees)]);
      }

      setShowImportModal(false);
    } catch (e) {
      setImportError(e.message || String(e));
    }
  };

  const handleTreeImageUpload = async (treeId, e) => {
    if (!isTeacherMode) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!storage || !mindMapUploadContext?.categoryId || !mindMapUploadContext?.exerciseId) {
      alert(
        'Chưa kết nối Firebase Storage hoặc thiếu mã chuyên đề/bài. Vui lòng mở tab Sơ đồ khi đã đăng nhập quản trị.'
      );
      return;
    }

    setUploadingTreeId(treeId);
    try {
      const path = buildTreeImageStoragePath(
        mindMapUploadContext.categoryId,
        mindMapUploadContext.exerciseId,
        treeId
      );
      const url = await uploadMindMapJpegToStorage(file, storage, path);
      setLogicTrees((trees) =>
        trees.map((t) => (t.id === treeId ? { ...t, imageUrl: url, useOwnFigure: true } : t))
      );
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setUploadingTreeId(null);
    }
  };

  const handleProblemImageUpload = async (e) => {
    if (!isTeacherMode) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!storage || !mindMapUploadContext?.categoryId || !mindMapUploadContext?.exerciseId) {
      alert(
        'Chưa kết nối Firebase Storage hoặc thiếu mã chuyên đề/bài. Vui lòng mở tab Sơ đồ khi đã đăng nhập quản trị.'
      );
      return;
    }

    setUploadingProblem(true);
    try {
      const path = buildProblemImageStoragePath(
        mindMapUploadContext.categoryId,
        mindMapUploadContext.exerciseId
      );
      const url = await uploadMindMapJpegToStorage(file, storage, path);
      setProblem((p) => ({ ...(p || {}), imageUrl: url }));
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setUploadingProblem(false);
    }
  };

  const clearProblemImage = () => {
    if (!isTeacherMode) return;
    setProblem((p) => ({ ...(p || {}), imageUrl: null }));
  };

  const handleSharedMindMapImageUpload = async (e) => {
    if (!isTeacherMode) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!storage || !mindMapUploadContext?.categoryId || !mindMapUploadContext?.exerciseId) {
      alert('Chưa kết nối Storage hoặc thiếu mã bài. Vui lòng thử lại khi đã mở tab Sơ đồ (quản trị).');
      return;
    }
    setUploadingSharedMindMap(true);
    try {
      const path = buildSharedMindMapImageStoragePath(
        mindMapUploadContext.categoryId,
        mindMapUploadContext.exerciseId
      );
      const url = await uploadMindMapJpegToStorage(file, storage, path);
      setSharedMindMapImageUrl(url);
    } catch (err) {
      alert(err?.message || String(err));
    } finally {
      setUploadingSharedMindMap(false);
    }
  };

  const clearSharedMindMapImage = () => {
    if (!isTeacherMode) return;
    setSharedMindMapImageUrl(null);
  };

  const updateTreeUseOwnFigure = (treeId, useOwn) => {
    if (!isTeacherMode) return;
    setLogicTrees((trees) =>
      trees.map((t) => (t.id === treeId ? { ...t, useOwnFigure: !!useOwn } : t))
    );
  };

  const updateTreeCaption = (treeId, newCaption) => {
    if (!isTeacherMode) return;
    setLogicTrees((trees) => trees.map((t) => (t.id === treeId ? { ...t, imageCaption: newCaption } : t)));
  };

  const updateTreeSolution = (treeId, text) => {
    if (!isTeacherMode) return;
    setLogicTrees((trees) => trees.map((t) => (t.id === treeId ? { ...t, solutionText: text } : t)));
  };

  const addTree = () => {
    if (!isTeacherMode) return;
    const newTree = {
      id: `q${Date.now()}`,
      title: 'Câu hỏi mới',
      imageUrl: null,
      useOwnFigure: false,
      imageCaption: '',
      horizontalSpacing: 16,
      solutionText: '',
      root: { id: `n_${Date.now()}_1`, type: 'goal', text: 'Đích cần chứng minh', children: [], hiddenDefault: false },
    };
    setLogicTrees([...logicTrees, newTree]);
  };

  const deleteTree = (treeId) => {
    if (!isTeacherMode) return;
    if (window.confirm('Xóa toàn bộ nội dung của câu này?')) {
      setLogicTrees((trees) => trees.filter((t) => t.id !== treeId));
    }
  };

  const addChildNode = (treeId, parentId) => {
    if (!isTeacherMode) return;
    setLogicTrees((trees) =>
      trees.map((tree) => {
        if (tree.id !== treeId) return tree;
        return {
          ...tree,
          root: mapTree(tree.root, (n) => {
            if (n.id === parentId) {
              return {
                ...n,
                children: [
                  ...(n.children || []),
                  { id: `n_${Date.now()}`, type: 'given', text: '$...$', children: [], hiddenDefault: true },
                ],
              };
            }
            return n;
          }),
        };
      })
    );
  };

  const updateNode = (treeId, nodeId, newText, newType, patch = null) => {
    if (!isTeacherMode) return;
    setLogicTrees((trees) =>
      trees.map((tree) => {
        if (tree.id !== treeId) return tree;
        return {
          ...tree,
          root: mapTree(tree.root, (n) =>
            n.id === nodeId
              ? {
                  ...n,
                  text: newText,
                  type: newType || n.type,
                  ...(patch && typeof patch === 'object' ? patch : null),
                }
              : n
          ),
        };
      })
    );
  };

  const deleteNode = (treeId, nodeId) => {
    if (!isTeacherMode) return;
    setLogicTrees((trees) =>
      trees.map((tree) => {
        if (tree.id !== treeId) return tree;
        if (tree.root.id === nodeId) {
          alert('Không thể xóa Mục tiêu Gốc!');
          return tree;
        }
        return { ...tree, root: filterTree(tree.root, nodeId) };
      })
    );
  };

  return (
    <div className="min-h-0 flex flex-col gap-4">
      {showLatexModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-4 sm:p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 sm:w-6 sm:h-6" />
                <h2 className="text-lg sm:text-xl font-bold">Mã LaTeX (Dạng Bảng cho Word)</h2>
              </div>
              <button type="button" onClick={() => setShowLatexModal(false)} className="text-indigo-200 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-hidden">
              <p className="text-sm text-slate-600 shrink-0">
                Thầy hãy bấm <b>&quot;Copy Sơ Đồ&quot;</b>, sau đó mở Word và nhấn <b>Ctrl + V</b> để dán.
              </p>
              <div className="w-full flex-1 p-4 bg-white border-2 border-indigo-100 rounded-xl overflow-auto min-h-[200px] [&_table]:!w-full [&_table]:!border-collapse [&_table]:border-none [&_table]:table-fixed [&_td]:!border-none">
                <div id="latex-export-table" dangerouslySetInnerHTML={{ __html: latexTableHtml }} />
              </div>
              <div className="flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLatexModal(false)}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={copyTableToWord}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Copy Sơ Đồ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportModal && isTeacherMode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-emerald-600 p-4 sm:p-5 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                <h2 className="text-lg sm:text-xl font-bold">Xác nhận Nội dung Import</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError('');
                }}
                className="text-emerald-200 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-6 overflow-y-auto">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700 mb-2">Quy tắc (đề + lời giải theo ý + sơ đồ):</p>
                <div className="bg-slate-100 p-4 rounded-xl text-xs font-mono text-slate-600 mb-4 whitespace-pre-wrap break-words overflow-x-auto border border-slate-200">
                  {`PROBLEM_TITLE: ...
PROBLEM_CONTENT:
...đề bài...

SOLUTION_FOR: Câu a: ...  (cùng cụm với TREE_TITLE: bên dưới)
...lời giải ý a (LaTeX $...$)...

SOLUTION_FOR: Câu b.1: ...
...lời giải ý b.1...

TREE_TITLE: Câu a: ...
[GOAL] ...
[NEED 1] ...

# SOLUTION_CONTENT: (cũ) chỉ gán lời giải cho ý đầu nếu không dùng SOLUTION_FOR:`}
                </div>
                <a
                  href="/mau-import-so-do-hinh9.txt"
                  download="mau-import-so-do-hinh9.txt"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-sm border border-emerald-300 hover:bg-emerald-200"
                >
                  <Download className="w-4 h-4" /> Tải file mẫu (.txt)
                </a>
              </div>

              <div className="flex-1 flex flex-col gap-4 min-w-0">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full flex-1 p-4 bg-slate-50 border-2 border-emerald-100 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm font-mono min-h-[250px] whitespace-pre"
                  placeholder="Dán toàn bộ nội dung cần Import vào đây..."
                />

                {importError && (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-200 whitespace-pre-wrap">
                    {importError}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportError('');
                    }}
                    className="px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => processImportText(false)}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg text-sm sm:text-base"
                  >
                    Import Nối tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => processImportText(true)}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg text-sm sm:text-base"
                  >
                    Import Ghi đè
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hideProblemSection && (
        <div className="relative z-10 transition-all">
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
            <button
              type="button"
              className="flex justify-between items-center p-5 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 text-left w-full"
              onClick={() => setIsProblemCollapsed(!isProblemCollapsed)}
            >
              <h2 className="text-xl font-black text-indigo-900 flex items-center gap-3">
                <Type className="w-6 h-6 text-indigo-600 shrink-0" />{' '}
                <span className="truncate">{editingProblem ? 'Đang sửa đề bài...' : problem.title}</span>
              </h2>
              <div className="flex items-center gap-3 shrink-0">
                {isTeacherMode && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProblem(!editingProblem);
                      if (isProblemCollapsed) setIsProblemCollapsed(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setEditingProblem(!editingProblem);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:shadow border border-indigo-100 transition-all cursor-pointer"
                  >
                    {editingProblem ? (
                      <>
                        <Save className="w-4 h-4" /> Lưu
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4" /> Sửa đề
                      </>
                    )}
                  </span>
                )}
                {isProblemCollapsed ? (
                  <ChevronDown className="text-indigo-400" />
                ) : (
                  <ChevronUp className="text-indigo-400" />
                )}
              </div>
            </button>

            {!isProblemCollapsed && (
              <div className="p-5">
                {editingProblem && isTeacherMode ? (
                  <div className="space-y-4">
                    <input
                      id={`mm-prob-title-${mmUid}`}
                      name={`mm-prob-title-${mmUid}`}
                      type="text"
                      aria-label="Tiêu đề đề bài"
                      value={problem.title}
                      onChange={(e) => setProblem((p) => ({ ...(p || {}), title: e.target.value }))}
                      className="w-full text-xl font-bold p-3 border-2 border-indigo-200 rounded-xl outline-none"
                    />
                    <textarea
                      id={`mm-prob-body-${mmUid}`}
                      name={`mm-prob-body-${mmUid}`}
                      aria-label="Nội dung đề bài (LaTeX $...$)"
                      value={problem.content}
                      onChange={(e) => setProblem((p) => ({ ...(p || {}), content: e.target.value }))}
                      className="w-full p-4 outline-none resize-y min-h-[150px] text-gray-800 font-mono text-sm border-2 border-indigo-200 rounded-xl"
                      placeholder="Hỗ trợ gõ $..."
                    />
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
                      <label className="text-sm font-bold text-indigo-900">Ảnh minh họa đề (tuỳ chọn)</label>
                      <p className="text-xs text-indigo-700">
                        Ảnh được nén và tải lên Firebase Storage — trong CSDL chỉ lưu đường dẫn (giảm dung lượng).
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor={`mm-prob-img-${mmUid}`}
                          className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-50 ${
                            uploadingProblem ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <Upload className="w-4 h-4" /> Chọn ảnh đề
                          <input
                            id={`mm-prob-img-${mmUid}`}
                            name={`mm-prob-img-${mmUid}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingProblem}
                            onChange={handleProblemImageUpload}
                          />
                        </label>
                        {problem?.imageUrl ? (
                          <button
                            type="button"
                            onClick={clearProblemImage}
                            disabled={uploadingProblem}
                            className="text-sm font-bold text-red-600 hover:underline disabled:opacity-50"
                          >
                            Xóa ảnh
                          </button>
                        ) : null}
                        {uploadingProblem ? (
                          <span className="text-sm font-semibold text-indigo-600">Đang tải lên…</span>
                        ) : null}
                      </div>
                      {problem?.imageUrl && !uploadingProblem ? (
                        <div className="rounded-lg border border-indigo-100 overflow-hidden bg-white max-h-56">
                          <img
                            src={problem.imageUrl}
                            alt="Minh họa đề"
                            className="w-full max-h-56 object-contain"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {problem?.imageUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-[min(45vh,380px)] min-h-[200px]">
                        <MindMapImagePanZoom imageUrl={problem.imageUrl} title="Minh họa đề" allowPan={isTeacherMode} />
                      </div>
                    ) : null}
                    <div className="text-slate-800 max-h-[50vh] overflow-y-auto px-2 text-base">
                      <MindMapMath text={problem.content} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {isTeacherMode && (
        <div className="flex justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setImportText(DEFAULT_IMPORT_TEXT_FULL);
              setImportError('');
              setShowImportModal(true);
            }}
            className="flex items-center gap-2 bg-white text-slate-600 border-2 border-slate-300 px-4 py-3 rounded-2xl font-bold shadow hover:bg-slate-50 transition-all text-sm"
          >
            <FileText className="w-4 h-4" /> Dán Text
          </button>
          <label
            htmlFor={`mm-import-txt-${mmUid}`}
            className="cursor-pointer flex items-center gap-2 bg-white text-emerald-600 border-2 border-emerald-500 px-6 py-3 rounded-2xl font-bold shadow hover:bg-emerald-50 transition-all text-sm sm:text-base"
          >
            <Upload className="w-5 h-5" /> Chọn File TXT
            <input
              id={`mm-import-txt-${mmUid}`}
              name={`mm-import-txt-${mmUid}`}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleTextFileUpload}
            />
          </label>
          <button
            type="button"
            onClick={addTree}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-indigo-500/30 hover:scale-105 transition-all text-sm sm:text-base"
          >
            <Plus className="w-5 h-5" /> Thêm Câu / Ý mới
          </button>
        </div>
      )}

      {isTeacherMode && (
        <div className="bg-violet-50/90 border border-violet-200 rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-black text-violet-900 uppercase tracking-wide">Ảnh hình chung (một file — nhiều khung ý)</h3>
          <p className="text-xs text-violet-800 leading-relaxed">
            Tải <strong>một lần</strong> cho cả bài; mỗi ý mặc định dùng chung (tiết kiệm Storage). Ở từng khung, bật &quot;Ảnh riêng cho ý này&quot; nếu cần hình khác. Tải lại ở đây sẽ{' '}
            <strong>ghi đè</strong> cùng một file trên Storage.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={`mm-shared-img-${mmUid}`}
              className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-violet-300 text-violet-800 font-bold text-sm hover:bg-violet-100/80 ${
                uploadingSharedMindMap ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <Upload className="w-4 h-4" /> Tải ảnh chung
              <input
                id={`mm-shared-img-${mmUid}`}
                name={`mm-shared-img-${mmUid}`}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingSharedMindMap}
                onChange={handleSharedMindMapImageUpload}
              />
            </label>
            {sharedMindMapImageUrl ? (
              <button
                type="button"
                onClick={clearSharedMindMapImage}
                disabled={uploadingSharedMindMap}
                className="text-sm font-bold text-red-600 hover:underline disabled:opacity-50"
              >
                Xóa ảnh chung
              </button>
            ) : null}
            {uploadingSharedMindMap ? (
              <span className="text-sm font-semibold text-violet-700">Đang tải…</span>
            ) : null}
          </div>
          {sharedMindMapImageUrl && !uploadingSharedMindMap ? (
            <div className="rounded-lg border border-violet-200 overflow-hidden bg-white max-h-40">
              <img
                src={sharedMindMapImageUrl}
                alt="Ảnh chung"
                className="w-full max-h-40 object-contain"
              />
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-8 min-w-0">
        {logicTrees.map((tree) => {
          const displayFigureUrl = resolveTreeFigureUrl(tree, sharedMindMapImageUrl);
          const showTreeFigureUpload =
            isTeacherMode && (tree.useOwnFigure === true || !sharedMindMapImageUrl);
          return (
          <div
            key={tree.id}
            className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
                {isTeacherMode ? (
                  <input
                    id={`mm-tree-title-${tree.id}`}
                    name={`mm-tree-title-${tree.id}`}
                    type="text"
                    aria-label="Tiêu đề khung ý trong sơ đồ"
                    value={tree.title}
                    onChange={(e) =>
                      setLogicTrees((trees) => trees.map((t) => (t.id === tree.id ? { ...t, title: e.target.value } : t)))
                    }
                    className="bg-transparent text-white text-xl md:text-2xl font-bold flex-1 min-w-0 outline-none border-b-2 border-transparent focus:border-indigo-400 py-1 transition-colors uppercase tracking-wide"
                  />
                ) : (
                  <div className="text-white text-xl md:text-2xl font-bold uppercase tracking-wide py-1 flex-1 min-w-0">
                    <MindMapMath text={tree.title} className="text-white [&_.katex]:text-white [&_.katex-display]:text-white" />
                  </div>
                )}

                {!isTeacherMode && (
                  <div className="flex rounded-xl overflow-hidden border border-emerald-500/50 bg-slate-800/90 p-1 gap-1 shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setTreeViewModes((m) => ({ ...m, [tree.id]: 'diagram' }))}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-colors ${
                        treeViewModes[tree.id] !== 'solution'
                          ? 'bg-emerald-500 text-white shadow'
                          : 'text-emerald-200 hover:bg-slate-700/80'
                      }`}
                    >
                      Sơ đồ
                    </button>
                    <button
                      type="button"
                      onClick={() => setTreeViewModes((m) => ({ ...m, [tree.id]: 'solution' }))}
                      className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-colors ${
                        treeViewModes[tree.id] === 'solution'
                          ? 'bg-emerald-500 text-white shadow'
                          : 'text-emerald-200 hover:bg-slate-700/80'
                      }`}
                    >
                      Lời giải
                    </button>
                  </div>
                )}
              </div>

              {isTeacherMode && (
                <div className="flex flex-wrap items-center gap-3 w-full justify-end border-t border-white/10 pt-3">
                  <div
                    className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
                    title="Kéo để chỉnh khoảng cách ngang giữa các ô trong sơ đồ"
                  >
                    <label htmlFor={`mm-tree-hgap-${tree.id}`} className="text-slate-400 text-xs font-bold whitespace-nowrap cursor-pointer">
                      Khoảng cách ô:
                    </label>
                    <input
                      id={`mm-tree-hgap-${tree.id}`}
                      name={`mm-tree-hgap-${tree.id}`}
                      type="range"
                      min="2"
                      max="150"
                      aria-valuemin={2}
                      aria-valuemax={150}
                      aria-valuenow={tree.horizontalSpacing !== undefined ? tree.horizontalSpacing : 16}
                      value={tree.horizontalSpacing !== undefined ? tree.horizontalSpacing : 16}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setLogicTrees((trees) =>
                          trees.map((t) => (t.id === tree.id ? { ...t, horizontalSpacing: val } : t))
                        );
                      }}
                      className="w-20 sm:w-32 accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLatexTableHtml(generateLatexTableHtml(tree));
                      setShowLatexModal(true);
                    }}
                    className="text-white bg-indigo-500/30 hover:bg-indigo-500/60 px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors text-sm whitespace-nowrap"
                  >
                    <Code className="w-4 h-4" /> <span className="hidden sm:inline">Xuất Word</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportToImage(tree.id, tree.title)}
                    className="text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors text-sm whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" /> <span className="hidden sm:inline">Xuất Ảnh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteTree(tree.id)}
                    className="text-slate-300 bg-rose-500/20 hover:bg-rose-500 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                    title="Xóa toàn bộ câu"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {isTeacherMode && (
              <div className="px-6 py-3 bg-emerald-50/95 border-b border-emerald-100">
                <label htmlFor={`mm-tree-sol-${tree.id}`} className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                  Lời giải chi tiết cho ý này (LaTeX $...$) — học sinh xem ở nút &quot;Lời giải&quot;
                </label>
                <textarea
                  id={`mm-tree-sol-${tree.id}`}
                  name={`mm-tree-sol-${tree.id}`}
                  value={tree.solutionText || ''}
                  onChange={(e) => updateTreeSolution(tree.id, e.target.value)}
                  className="w-full mt-2 min-h-[100px] p-3 outline-none resize-y text-gray-800 font-mono text-sm border-2 border-emerald-200 rounded-xl focus:border-emerald-500"
                  placeholder="Hoặc dùng Import với SOLUTION_FOR: cùng tiêu đề với TREE_TITLE..."
                  spellCheck={false}
                />
              </div>
            )}

            <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
              <div className="w-full lg:w-[40%] p-4 lg:p-6 flex flex-col bg-slate-50">
                <div className="flex justify-between items-start gap-3 mb-4 flex-wrap">
                  <div className="space-y-2 min-w-0">
                    <h4 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-indigo-500 shrink-0" /> Hình vẽ
                    </h4>
                    {isTeacherMode ? (
                      <label htmlFor={`mm-tree-ownfig-${tree.id}`} className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer max-w-full">
                        <input
                          id={`mm-tree-ownfig-${tree.id}`}
                          name={`mm-tree-ownfig-${tree.id}`}
                          type="checkbox"
                          className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={tree.useOwnFigure === true}
                          onChange={(e) => updateTreeUseOwnFigure(tree.id, e.target.checked)}
                        />
                        <span>
                          <span className="font-semibold text-slate-800">Ảnh riêng cho ý này</span>
                          <span className="block text-xs text-slate-500 mt-0.5">
                            Bỏ chọn để dùng ảnh chung (một file — nhiều khung).
                          </span>
                        </span>
                      </label>
                    ) : null}
                  </div>
                  {tree.useOwnFigure === true && tree.imageUrl && isTeacherMode && (
                    <label
                      htmlFor={`mm-tree-img-replace-${tree.id}`}
                      className={`cursor-pointer text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shrink-0 ${
                        uploadingTreeId === tree.id ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      Thay ảnh riêng
                      <input
                        id={`mm-tree-img-replace-${tree.id}`}
                        name={`mm-tree-img-replace-${tree.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingTreeId === tree.id}
                        onChange={(e) => handleTreeImageUpload(tree.id, e)}
                      />
                    </label>
                  )}
                </div>

                <div className="flex-1 min-h-[250px] lg:min-h-[400px] bg-white rounded-2xl border-2 border-dashed border-slate-300 relative overflow-hidden shadow-sm flex flex-col">
                  {displayFigureUrl ? (
                    <MindMapImagePanZoom imageUrl={displayFigureUrl} title={tree.title} allowPan={isTeacherMode} />
                  ) : (
                    <div className="text-center p-6 text-slate-400 absolute inset-0 flex flex-col items-center justify-center">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="font-bold text-lg text-slate-500">Chưa có hình vẽ</p>
                      {isTeacherMode ? (
                        showTreeFigureUpload ? (
                          <>
                            <p className="text-sm mt-1 mb-4">
                              Ảnh nén JPEG rồi lưu trên Storage — hoặc dùng <strong>ảnh chung</strong> phía trên.
                            </p>
                            <label
                              htmlFor={`mm-tree-img-first-${tree.id}`}
                              className={`cursor-pointer bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors inline-block ${
                                uploadingTreeId === tree.id ? 'opacity-50 pointer-events-none' : ''
                              }`}
                            >
                              <Upload className="w-5 h-5 inline mr-2 -mt-1" /> Tải ảnh riêng
                              <input
                                id={`mm-tree-img-first-${tree.id}`}
                                name={`mm-tree-img-first-${tree.id}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingTreeId === tree.id}
                                onChange={(e) => handleTreeImageUpload(tree.id, e)}
                              />
                            </label>
                          </>
                        ) : (
                          <p className="text-sm mt-2 px-4 text-slate-500">
                            Đang chờ <strong>ảnh chung</strong> ở khối tím phía trên, hoặc bật &quot;Ảnh riêng cho ý này&quot; để tải hình khác.
                          </p>
                        )
                      ) : (
                        <p className="text-sm mt-1">Giáo viên chưa tải lên hình vẽ cho phần này.</p>
                      )}
                    </div>
                  )}
                  {uploadingTreeId === tree.id && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center z-20 text-indigo-700 font-bold text-sm px-4 text-center gap-1">
                      <span>Đang nén &amp; tải lên Storage…</span>
                      <span className="text-xs font-normal text-slate-600">Vui lòng chờ vài giây</span>
                    </div>
                  )}
                </div>

                {isTeacherMode ? (
                  <div className="mt-4">
                    <textarea
                      id={`mm-tree-caption-${tree.id}`}
                      name={`mm-tree-caption-${tree.id}`}
                      aria-label="Ghi chú cho hình vẽ"
                      value={tree.imageCaption || ''}
                      onChange={(e) => updateTreeCaption(tree.id, e.target.value)}
                      placeholder="Ghi chú thêm cho hình vẽ..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-base font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-y min-h-[80px] shadow-sm transition-shadow placeholder-slate-400"
                    />
                  </div>
                ) : (
                  tree.imageCaption && (
                    <div className="mt-4 w-full p-4 bg-white border border-slate-200 rounded-xl text-base font-medium text-slate-700 shadow-sm whitespace-pre-wrap leading-relaxed">
                      {tree.imageCaption}
                    </div>
                  )
                )}
              </div>

              <div className="w-full lg:w-[60%] flex flex-col min-h-[280px]">
                {isTeacherMode || treeViewModes[tree.id] !== 'solution' ? (
                  <MindMapTreeContainer treeId={tree.id}>
                    <MindMapTreeNode
                      node={tree.root}
                      treeId={tree.id}
                      treeSpacing={tree.horizontalSpacing !== undefined ? tree.horizontalSpacing : 16}
                      isTeacherMode={isTeacherMode}
                      editingNode={editingNode}
                      setEditingNode={setEditingNode}
                      updateNode={updateNode}
                      deleteNode={deleteNode}
                      addChildNode={addChildNode}
                    />
                  </MindMapTreeContainer>
                ) : (
                  <div className="flex-1 p-5 md:p-6 overflow-y-auto max-h-[min(70vh,720px)] bg-slate-50/50">
                    {String(tree.solutionText || '').trim() ? (
                      <div className="text-slate-900 text-base leading-relaxed space-y-3">
                        <MindMapMath text={tree.solutionText} />
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-12 italic">
                        Giáo viên chưa nhập lời giải chi tiết cho ý này.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
