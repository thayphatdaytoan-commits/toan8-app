/**
 * Tạo file .docx mẫu trong public/ để import đề thi / bài giảng.
 * Word → mammoth.extractRawText → cùng quy tắc với .txt (xuống dòng = đoạn văn bản trong Word).
 * Đồng bộ 100% với mau-import-bai-giang.txt và mau-import-de-thi.txt.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

function paragraphsFromText(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line })],
      })
  );
}

const LESSON_TXT_PATH = path.join(publicDir, 'mau-import-bai-giang.txt');
const QUIZ_TXT_PATH = path.join(publicDir, 'mau-import-de-thi.txt');
const LESSON_DOCX_BODY = fs.readFileSync(LESSON_TXT_PATH, 'utf8').replace(/^\uFEFF/, '');
const QUIZ_DOCX_BODY = fs.readFileSync(QUIZ_TXT_PATH, 'utf8').replace(/^\uFEFF/, '');

async function main() {
  const quizDoc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Mẫu import đề thi (.docx) — đồng bộ mau-import-de-thi.txt',
            heading: HeadingLevel.TITLE,
          }),
          ...paragraphsFromText(QUIZ_DOCX_BODY),
        ],
      },
    ],
  });

  const lessonDoc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Mẫu import bài giảng (.docx) — đồng bộ mau-import-bai-giang.txt',
            heading: HeadingLevel.TITLE,
          }),
          ...paragraphsFromText(LESSON_DOCX_BODY),
        ],
      },
    ],
  });

  const outQuiz = path.join(publicDir, 'mau-import-de-thi-sample-v2.docx');
  const outQuizAlias = path.join(publicDir, 'mau-import-de-thi.docx');
  const outLesson = path.join(publicDir, 'mau-import-bai-giang.docx');
  const outLessonV2 = path.join(publicDir, 'mau-import-bai-giang-sample-v2.docx');

  const lessonBuf = await Packer.toBuffer(lessonDoc);
  const quizBuf = await Packer.toBuffer(quizDoc);
  await fs.promises.writeFile(outQuiz, quizBuf);
  await fs.promises.writeFile(outQuizAlias, quizBuf);
  await fs.promises.writeFile(outLesson, lessonBuf);
  await fs.promises.writeFile(outLessonV2, lessonBuf);

  console.log('[generate-sample-docx] Lesson lines:', LESSON_DOCX_BODY.split(/\r?\n/).length);
  console.log('[generate-sample-docx] Quiz lines:', QUIZ_DOCX_BODY.split(/\r?\n/).length);
  console.log('[generate-sample-docx] Wrote:', outQuiz);
  console.log('[generate-sample-docx] Wrote:', outQuizAlias);
  console.log('[generate-sample-docx] Wrote:', outLesson);
  console.log('[generate-sample-docx] Wrote:', outLessonV2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
