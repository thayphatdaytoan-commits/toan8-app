import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
  UserCircle,
} from 'lucide-react';
import {
  consumeAuthRedirectResult,
  registerWithEmailPassword,
  signInWithGoogleProvider,
  upsertSelfRegisteredStudent,
  validateUsernameFormat,
  normalizeUsername,
  findStudentByUsername,
} from './studentAuth';
import registerHeroImg from './assets/register-hero.jpg';

const GRADE_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.6 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8s2.5-5.8 5.6-5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.9 3.4 14.7 2.4 12 2.4 6.9 2.4 2.7 6.6 2.7 11.7S6.9 21 12 21c6.9 0 8.6-4.9 8.6-7.4 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}

function FieldIcon({ children }) {
  return (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      {children}
    </span>
  );
}

export default function StudentRegisterScreen({
  publicGrade = '11',
  allowedStudents = [],
  onSuccess,
  onGoLogin,
  onGoHome,
}) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gradeLevel, setGradeLevel] = useState(
    GRADE_OPTIONS.includes(String(publicGrade)) ? String(publicGrade) : '11'
  );
  const [classLabel, setClassLabel] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await consumeAuthRedirectResult();
        if (cancelled || !result?.user) return;
        setBusy(true);
        const session = await upsertSelfRegisteredStudent({
          firebaseUser: result.user,
          profile: {
            fullName: result.user.displayName || '',
            email: result.user.email || '',
            gradeLevel: String(publicGrade || '8'),
            classLabel: '',
            school: '',
            username: '',
            phone: '',
          },
          allowedStudents,
        });
        if (!cancelled) onSuccess?.(session.name, session.className, session.gradeLevel);
      } catch (err) {
        if (!cancelled) setError(err.message || String(err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileBase = () => ({
    fullName: fullName.trim(),
    username: normalizeUsername(username),
    phone: phone.trim(),
    school: school.trim(),
    email: email.trim(),
    gradeLevel,
    classLabel: classLabel.trim(),
  });

  const finishRegistration = async (firebaseUser, overrides = {}) => {
    const session = await upsertSelfRegisteredStudent({
      firebaseUser,
      profile: { ...profileBase(), ...overrides },
      allowedStudents,
    });
    onSuccess?.(session.name, session.className, session.gradeLevel);
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) return setError('Nhập họ và tên.');
    if (!email.trim()) return setError('Nhập email.');
    if (!password || password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự.');

    const formatCheck = validateUsernameFormat(username);
    if (!formatCheck.ok) return setError(formatCheck.error);

    const resolvedUsername = formatCheck.username || email.trim().toLowerCase();
    if (findStudentByUsername(allowedStudents, resolvedUsername)) {
      return setError('Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.');
    }

    setBusy(true);
    try {
      const cred = await registerWithEmailPassword({
        email: email.trim(),
        password,
        displayName: fullName.trim(),
      });
      await finishRegistration(cred.user, {
        username: resolvedUsername,
        loginPassword: password,
      });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    if (!gradeLevel) return setError('Chọn khối lớp đang học.');
    setBusy(true);
    try {
      const cred = await signInWithGoogleProvider();
      // Redirect: trang sẽ tải lại, kết quả xử lý ở useEffect
      if (!cred?.user) return;
      const user = cred.user;
      await finishRegistration(user, {
        fullName: fullName.trim() || user.displayName || '',
        email: email.trim() || user.email || '',
      });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row lg:items-stretch bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden my-4 md:my-6 max-w-6xl mx-auto">
      {/* Cột trái — ảnh phủ kín khung, không lộ viền xanh */}
      <div className="relative lg:w-[50%] min-h-[200px] sm:min-h-[240px] lg:min-h-0 lg:flex-1 overflow-hidden">
        <img
          src={registerHeroImg}
          alt="Đăng ký trải nghiệm miễn phí — Thầy Phát dạy toán"
          className="absolute inset-0 w-full h-full object-cover object-center"
          decoding="async"
        />
      </div>

      {/* Cột phải — form */}
      <div className="flex-1 flex flex-col min-w-0 lg:w-[50%]">
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 md:py-6">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 text-center mb-4">Đăng ký tài khoản</h2>

          <form onSubmit={handleEmailRegister} className="max-w-md mx-auto space-y-3">
            <div className="relative">
              <FieldIcon>
                <User className="w-5 h-5" />
              </FieldIcon>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setError('');
                }}
                placeholder="Nhập họ và tên"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                autoComplete="name"
              />
            </div>

            <div className="relative">
              <FieldIcon>
                <UserCircle className="w-5 h-5" />
              </FieldIcon>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  // Không cho khoảng trắng khi gõ
                  setUsername(e.target.value.replace(/\s/g, ''));
                  setError('');
                }}
                placeholder="Phat@xyz"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 placeholder:text-slate-300"
                autoComplete="username"
              />
              <p className="mt-1 text-[11px] text-slate-400 px-1">
                Viết liền, không khoảng trắng. Để trống sẽ dùng Gmail đăng ký làm tên đăng nhập.
              </p>
            </div>

            <div className="relative">
              <FieldIcon>
                <Phone className="w-5 h-5" />
              </FieldIcon>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                autoComplete="tel"
              />
            </div>

            <div className="flex gap-3">
              <div className="w-[108px] shrink-0">
                <label className="sr-only">Khối lớp</label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Trường"
                className="flex-1 px-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
                autoComplete="organization"
              />
            </div>

            <input type="hidden" value={classLabel} readOnly />

            <div className="relative">
              <FieldIcon>
                <Mail className="w-5 h-5" />
              </FieldIcon>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="Nhập email"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <FieldIcon>
                <Lock className="w-5 h-5" />
              </FieldIcon>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Nhập mật khẩu"
                className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-black text-lg shadow-md shadow-orange-200 transition-colors"
            >
              {busy ? 'Đang xử lý…' : 'Đăng ký'}
            </button>
          </form>

          <div className="max-w-md mx-auto mt-4">
            <div className="flex items-center gap-3 text-slate-400 text-sm mb-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span>hoặc</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleSignIn}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-60"
            >
              <GoogleIcon />
              Tiếp tục bằng Google
            </button>

            <p className="text-center text-sm text-slate-600 mt-4">
              Bạn đã có tài khoản?{' '}
              <button
                type="button"
                onClick={onGoLogin}
                className="font-bold text-blue-600 hover:underline"
              >
                Đăng nhập ngay
              </button>
            </p>

            <button
              type="button"
              onClick={onGoHome}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
