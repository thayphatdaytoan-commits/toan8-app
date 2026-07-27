/* eslint-disable */
/** Logo MathEdu (sách xanh + ngọn lửa) — file public/mathedu-logo.png */
export default function MathEduLogo({ className = 'h-10', alt = 'MathEdu' }) {
  return (
    <img
      src="/mathedu-logo.png"
      alt={alt}
      className={`w-auto max-w-full object-contain object-left ${className}`}
      decoding="async"
    />
  );
}
