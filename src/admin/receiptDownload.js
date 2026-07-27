/* eslint-disable */
/** Tải một DOM element thành file PNG (html2canvas). */
export async function downloadElementAsPng(element, filename = 'phieu.png') {
  if (!element) throw new Error('Không tìm thấy phiếu để tải.');
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = String(filename || 'phieu.png').replace(/[^\w.\-À-ỹ ]+/gi, '_');
  link.href = dataUrl;
  link.click();
  return dataUrl;
}

export function formatMoneyVnd(n) {
  return `${(Number(n) || 0).toLocaleString('vi-VN')}đ`;
}

export function currentMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthLabelVi(monthKey) {
  const m = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return monthKey || '';
  return `Tháng ${Number(m[2])}/${m[1]}`;
}

export function monthKeyToParts(monthKey) {
  const m = String(monthKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}
