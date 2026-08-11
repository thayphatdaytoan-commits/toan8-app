import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const app = initializeApp({
  apiKey: 'AIzaSyBdQ11EDhwa46SdlrAHK71_7wEPja7ZqIM',
  authDomain: 'thayphatdaytoan-7832c.firebaseapp.com',
  projectId: 'thayphatdaytoan-7832c',
  storageBucket: 'thayphatdaytoan-7832c.firebasestorage.app',
  messagingSenderId: '249059029216',
  appId: '1:249059029216:web:2228f7c78483628e0ba085',
});
const auth = getAuth(app);
const db = getFirestore(app);
await signInAnonymously(auth);

const jobs = [
  {
    id: 'HaWodiVhNUIIRfrWwRH0',
    out: 'tai-lieu-dang-web/Toán 9/Bài Giảng/CHƯƠNG III. CĂN BẬC HAI VÀ CĂN BẬC BA/Bài 9. Biến đổi đơn giản và rút gọn biểu thức chứa căn thức bậc hai/output/Bai-9-content.json',
  },
  {
    id: 'YKANp5L6hwDd99Vd9BqG',
    out: 'tai-lieu-dang-web/Toán 9/Bài Giảng/CHƯƠNG III. CĂN BẬC HAI VÀ CĂN BẬC BA/Bài 10. Căn bậc ba và căn thức bậc ba/output/Bai-10-content.json',
  },
];

for (const job of jobs) {
  const d = await getDoc(doc(db, 'math_lessons_v2', job.id));
  const data = d.data();
  const content = data.content || '';
  const brackets = content.match(/\$\[\{?/g);
  mkdirSync(dirname(job.out), { recursive: true });
  // Pretty JSON snapshot of live content (already normalized $...$)
  let pretty = content;
  try { pretty = JSON.stringify(JSON.parse(content), null, 2); } catch {}
  writeFileSync(job.out, pretty);
  const metaOut = job.out.replace('-content.json', '-meta.txt');
  writeFileSync(
    metaOut,
    [
      `@grade_level: ${data.grade_level}`,
      `@chapter: ${data.chapter}`,
      `@lesson_no: ${data.lesson_no}`,
      `@title: ${data.title}`,
      `@slug: ${data.slug}`,
      `@firestore_id: ${job.id}`,
      `@note: content đã chuẩn hóa $...$ (không $[...]$); xem file *-content.json`,
      '',
    ].join('\n'),
  );
  console.log(JSON.stringify({
    id: job.id,
    title: data.title,
    out: job.out,
    brackets: brackets?.length || 0,
    len: pretty.length,
  }));
}
process.exit(0);
