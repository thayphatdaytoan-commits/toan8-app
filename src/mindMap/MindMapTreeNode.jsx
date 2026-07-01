import { useState } from 'react';
import {
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Eye,
  EyeOff,
  GitMerge,
  Save,
  Trash2,
} from 'lucide-react';
import MindMapMath from './MindMapMath';

export default function MindMapTreeNode({
  node,
  treeId,
  treeSpacing = 16,
  isTeacherMode,
  editingNode,
  setEditingNode,
  updateNode,
  deleteNode,
  addChildNode,
}) {
  const isEditing = editingNode?.treeId === treeId && editingNode?.nodeId === node.id && isTeacherMode;
  // Học sinh: mặc định ẩn mọi ô không phải "MỤC TIÊU" (trừ khi giáo viên mở)
  const hiddenByDefaultForStudent = !isTeacherMode && node.type !== 'goal' && node.hiddenDefault !== false;
  const [isRevealed, setIsRevealed] = useState(!hiddenByDefaultForStudent);
  const isHiddenForStudent = hiddenByDefaultForStudent && !isRevealed;

  const typeConfig = {
    goal: {
      bg: 'bg-gradient-to-br from-rose-50 to-red-100',
      border: 'border-rose-300',
      text: 'text-rose-900',
      label: 'MỤC TIÊU',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    need: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      border: 'border-indigo-300',
      text: 'text-indigo-900',
      label: 'CẦN CHỨNG MINH',
      icon: <ArrowUp className="w-5 h-5" />,
    },
    given: {
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-100',
      border: 'border-emerald-300',
      text: 'text-teal-900',
      label: 'GIẢ THIẾT / ĐỀ BÀI',
      icon: <ChevronRight className="w-5 h-5" />,
    },
  };
  const config = typeConfig[node.type] || typeConfig.need;

  return (
    <div
      className="flex flex-col items-center relative"
      style={{ paddingLeft: `${treeSpacing}px`, paddingRight: `${treeSpacing}px` }}
    >
      <div className="z-20 relative group">
        <div
          className={`relative min-w-[260px] max-w-[380px] p-4 rounded-2xl shadow-lg transition-all duration-300 ${config.bg} ${config.border} border-2 ${isTeacherMode ? 'hover:-translate-y-1 hover:shadow-xl' : ''}`}
        >
          {isTeacherMode && (
            <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity z-30">
              {node.type !== 'goal' && (
                <select
                  value={node.type}
                  onChange={(e) => updateNode(treeId, node.id, node.text, e.target.value)}
                  className="p-1.5 text-xs bg-white border border-gray-200 rounded-full shadow-sm text-gray-700 outline-none cursor-pointer font-medium"
                >
                  <option value="need">Loại: Cần chứng minh</option>
                  <option value="given">Loại: Giả thiết / Đề bài</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => setEditingNode(isEditing ? null : { treeId, nodeId: node.id })}
                className="p-2 bg-white text-gray-600 rounded-full shadow border border-gray-200 hover:text-blue-600 hover:bg-blue-50"
              >
                {isEditing ? <Save className="w-4 h-4 text-green-600" /> : <Edit2 className="w-4 h-4" />}
              </button>
              {node.type !== 'goal' && (
                <button
                  type="button"
                  onClick={() => deleteNode(treeId, node.id)}
                  className="p-2 bg-white text-red-500 rounded-full shadow border border-red-100 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div
            className={`flex items-center justify-between gap-2 text-xs font-black tracking-widest mb-2 ${config.text} opacity-90 uppercase`}
          >
            <div className="flex items-center gap-2">
              {config.icon} {config.label}
            </div>
            {isTeacherMode ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateNode(treeId, node.id, node.text, node.type, { hiddenDefault: node.hiddenDefault === false });
                }}
                className={`p-1.5 rounded-md hover:bg-black/10 transition-colors focus:outline-none ${
                  node.hiddenDefault === false ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/10 text-rose-700'
                }`}
                title={node.hiddenDefault === false ? 'Học sinh: ĐANG MỞ mặc định' : 'Học sinh: ĐANG ĐÓNG mặc định'}
              >
                {node.hiddenDefault === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            ) : hiddenByDefaultForStudent ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRevealed((v) => !v);
                }}
                className={`p-1.5 rounded-md hover:bg-black/10 transition-colors focus:outline-none ${
                  isHiddenForStudent ? 'bg-black/5 text-slate-500' : 'bg-emerald-500/15 text-emerald-700'
                }`}
                title={isHiddenForStudent ? 'Bấm để hiện nội dung' : 'Ẩn lại'}
              >
                {isHiddenForStudent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            ) : null}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={node.text}
                onChange={(e) => updateNode(treeId, node.id, e.target.value)}
                className="w-full p-3 outline-none resize-y min-h-[100px] text-gray-800 rounded-xl border-2 border-indigo-200 focus:border-indigo-400 font-mono text-sm bg-white/90 backdrop-blur"
                placeholder="Gõ $...$ để nhập công thức Toán"
              />
            </div>
          ) : isHiddenForStudent ? (
            <button
              type="button"
              onClick={() => setIsRevealed(true)}
              className="w-full text-slate-400 font-semibold text-sm italic flex flex-col items-center justify-center py-3 cursor-pointer hover:text-slate-600 bg-white/50 rounded-xl border border-dashed border-slate-300 transition-colors"
            >
              <EyeOff className="w-6 h-6 mb-1 opacity-50" />
              <span>Nội dung đang bị đóng (Bấm để xem)</span>
            </button>
          ) : (
            <div className="text-gray-900 font-semibold text-base transition-all">
              <MindMapMath text={node.text} />
            </div>
          )}

          {isTeacherMode && (
            <button
              type="button"
              onClick={() => addChildNode(treeId, node.id)}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 p-1.5 bg-white border-2 border-indigo-200 rounded-full text-indigo-600 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-50 hover:scale-110 z-30"
              title="Thêm nhánh suy luận"
            >
              <GitMerge className="w-5 h-5 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="flex justify-center pt-8 relative z-10 w-full">
          <div className="absolute top-0 left-1/2 w-[3px] h-8 bg-slate-400 -ml-[1.5px]">
            <svg
              className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-5 h-5 text-red-500 z-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6-6 6 6" />
            </svg>
          </div>

          {node.children.map((child, index) => {
            const isFirst = index === 0;
            const isLast = index === node.children.length - 1;
            const isOnly = node.children.length === 1;

            return (
              <div key={child.id} className="relative flex flex-col items-center">
                {!isOnly && (
                  <div
                    className={`absolute top-0 h-[3px] bg-slate-400
                      ${isFirst ? 'left-1/2 right-0' : ''}
                      ${isLast ? 'left-0 right-1/2' : ''}
                      ${!isFirst && !isLast ? 'left-0 right-0' : ''}
                    `}
                  />
                )}
                <div className="w-[3px] h-8 bg-slate-400" />
                <MindMapTreeNode
                  node={child}
                  treeId={treeId}
                  treeSpacing={treeSpacing}
                  isTeacherMode={isTeacherMode}
                  editingNode={editingNode}
                  setEditingNode={setEditingNode}
                  updateNode={updateNode}
                  deleteNode={deleteNode}
                  addChildNode={addChildNode}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
