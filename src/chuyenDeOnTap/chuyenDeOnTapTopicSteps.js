/**
 * Gom chủ đề thành các bước — mỗi màn hình chỉ một nội dung (mở đầu / video / lý thuyết / từng ví dụ / câu hỏi).
 * @param {object} topic
 * @returns {Array<{ kind: string, id: string, title: string, body?: string, videoUrl?: string, question?: object, questionIndex?: number, example?: object, exampleIndex?: number }>}
 */
export function buildTopicSteps(topic) {
  if (!topic) return [];
  const steps = [];
  const desc = String(topic.description || '').trim();
  if (desc) {
    steps.push({
      kind: 'intro',
      id: `intro_${topic.id}`,
      title: 'Mở đầu chủ đề',
      body: desc,
    });
  }
  const v = String(topic.videoUrl || '').trim();
  if (topic.showVideoTopic !== false && v) {
    steps.push({
      kind: 'video',
      id: `video_${topic.id}`,
      title: 'Video',
      videoUrl: v,
    });
  }
  const summary = String(topic.summary || '').trim();
  if (topic.showSummaryTopic !== false && summary) {
    steps.push({
      kind: 'theory',
      id: `theory_${topic.id}`,
      title: 'Lý thuyết',
      body: summary,
    });
  }
  const examples = Array.isArray(topic.examples) ? topic.examples : [];
  if (topic.showExampleTopic !== false) {
    if (examples.length > 0) {
      examples.forEach((ex, i) => {
        const id = String(ex?.id || `ex_${topic.id}_${i}`);
        steps.push({
          kind: 'example_item',
          id: `step_${id}`,
          title: String(ex?.label || `Ví dụ ${i + 1}`),
          example: ex,
          exampleIndex: i,
        });
      });
    } else {
      const ex = String(topic.example || '').trim();
      if (ex) {
        steps.push({
          kind: 'example_item',
          id: `example_legacy_${topic.id}`,
          title: 'Ví dụ',
          example: {
            id: `legacy_${topic.id}`,
            order: 1,
            label: 'Ví dụ',
            stem: ex,
            answer: '',
            hint: '',
          },
          exampleIndex: 0,
        });
      }
    }
  }
  const qs = Array.isArray(topic.questions) ? topic.questions : [];
  qs.forEach((q, qi) => {
    steps.push({
      kind: 'question',
      id: String(q?.id || `q_${topic.id}_${qi}`),
      title: String(q?.label || `Câu ${qi + 1}`),
      question: q,
      questionIndex: qi,
    });
  });
  return steps;
}

export function deepCloneCourse(course) {
  try {
    if (typeof structuredClone === 'function') return structuredClone(course);
  } catch {
    /* fallthrough */
  }
  return JSON.parse(JSON.stringify(course));
}
