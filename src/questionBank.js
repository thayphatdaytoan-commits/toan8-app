export const COLLECTION_QUESTION_BANK = 'math_question_bank_v1';

export const COG_LEVEL = {
  recognize: 'recognize',
  understand: 'understand',
  apply: 'apply',
  apply_high: 'apply_high',
};

export const COG_LEVEL_LABEL = {
  [COG_LEVEL.recognize]: 'Nhận biết',
  [COG_LEVEL.understand]: 'Thông hiểu',
  [COG_LEVEL.apply]: 'Vận dụng',
  [COG_LEVEL.apply_high]: 'Vận dụng cao',
};

export const QUESTION_TYPE = {
  multiple_choice: 'multiple_choice',
  true_false_group: 'true_false_group',
  short_answer: 'short_answer',
  essay: 'essay',
};

export const QUESTION_TYPE_LABEL = {
  [QUESTION_TYPE.multiple_choice]: 'Trắc nghiệm',
  [QUESTION_TYPE.true_false_group]: 'Đúng/Sai',
  [QUESTION_TYPE.short_answer]: 'Điền số',
  [QUESTION_TYPE.essay]: 'Tự luận',
};

export function normalizeTopicTags(raw) {
  const arr = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  return [...new Set(arr.map((x) => String(x || '').trim()).filter(Boolean))];
}

export function normalizeCognitiveLevel(raw) {
  const v = String(raw || '').trim();
  if (v === COG_LEVEL.recognize) return v;
  if (v === COG_LEVEL.understand) return v;
  if (v === COG_LEVEL.apply) return v;
  if (v === COG_LEVEL.apply_high) return v;
  return COG_LEVEL.recognize;
}

export function normalizeQuestionType(raw) {
  const v = String(raw || '').trim();
  if (v === QUESTION_TYPE.multiple_choice) return v;
  if (v === QUESTION_TYPE.true_false_group) return v;
  if (v === QUESTION_TYPE.short_answer) return v;
  if (v === QUESTION_TYPE.essay) return v;
  return QUESTION_TYPE.multiple_choice;
}

export function emptyBankQuestionDraft({ grade_level } = {}) {
  const gl = (grade_level ?? '').toString().trim();
  return {
    isNew: true,
    grade_level: gl,
    chapter: '',
    lesson_no: '',
    category: '',
    topic_tags: [],
    cognitive_level: COG_LEVEL.recognize,
    q_type: QUESTION_TYPE.multiple_choice,
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    tfItems: [
      { key: 'a', text: '', correct: true },
      { key: 'b', text: '', correct: false },
      { key: 'c', text: '', correct: true },
      { key: 'd', text: '', correct: false },
    ],
    shortCorrect: '',
    answerPlaceholder: 'Nhập đáp án...',
    explanation: '',
  };
}

export function bankQuestionToQuizQuestion(bq) {
  const q_type = normalizeQuestionType(bq?.q_type);
  const t0 = Date.now();
  const base = {
    id: `q_${t0}_${Math.random().toString(36).slice(2, 8)}`,
    type: q_type,
    question: (bq?.question ?? '').toString(),
    explanation: (bq?.explanation ?? '').toString(),
    bank_id: bq?.id || bq?.bank_id || undefined,
    cognitive_level: normalizeCognitiveLevel(bq?.cognitive_level),
    topic_tags: normalizeTopicTags(bq?.topic_tags),
    chapter: (bq?.chapter ?? '').toString(),
    lesson_no: (bq?.lesson_no ?? '').toString(),
    category: (bq?.category ?? '').toString(),
  };

  if (q_type === QUESTION_TYPE.multiple_choice) {
    return {
      ...base,
      options: Array.isArray(bq?.options) ? bq.options.map((x) => String(x ?? '')) : ['', '', '', ''],
      correctAnswer: Number.isInteger(bq?.correctAnswer) ? bq.correctAnswer : 0,
    };
  }
  if (q_type === QUESTION_TYPE.true_false_group) {
    return {
      ...base,
      tfItems: Array.isArray(bq?.tfItems) ? bq.tfItems : [],
    };
  }
  if (q_type === QUESTION_TYPE.short_answer) {
    return {
      ...base,
      shortCorrect: (bq?.shortCorrect ?? '').toString(),
      answerPlaceholder: (bq?.answerPlaceholder ?? 'Nhập đáp án...').toString(),
    };
  }
  if (q_type === QUESTION_TYPE.essay) {
    return {
      ...base,
    };
  }
  return { ...base };
}

