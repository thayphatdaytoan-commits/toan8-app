import React, { useEffect, useMemo, useState } from 'react';
import {
  User,
  Settings,
  Star,
  CheckCircle2,
  XCircle,
  Pencil,
  Search,
  Shield,
  Crown,
} from 'lucide-react';

const PROVINCES = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'An Giang',
  'Bà Rịa - Vũng Tàu',
  'Bắc Giang',
  'Bắc Kạn',
  'Bạc Liêu',
  'Bắc Ninh',
  'Bến Tre',
  'Bình Định',
  'Bình Dương',
  'Bình Phước',
  'Bình Thuận',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Đắk Nông',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Giang',
  'Hà Nam',
  'Hà Tĩnh',
  'Hải Dương',
  'Hậu Giang',
  'Hòa Bình',
  'Hưng Yên',
  'Khánh Hòa',
  'Kiên Giang',
  'Kon Tum',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Long An',
  'Nam Định',
  'Nghệ An',
  'Ninh Bình',
  'Ninh Thuận',
  'Phú Thọ',
  'Phú Yên',
  'Quảng Bình',
  'Quảng Nam',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sóc Trăng',
  'Sơn La',
  'Tây Ninh',
  'Thái Bình',
  'Thái Nguyên',
  'Thanh Hóa',
  'Thừa Thiên Huế',
  'Tiền Giang',
  'Trà Vinh',
  'Tuyên Quang',
  'Vĩnh Long',
  'Vĩnh Phúc',
  'Yên Bái',
];

const GRADES = ['6', '7', '8', '9', '10', '11', '12'];

function isVipAccount(profile) {
  if (!profile) return false;
  if (profile.is_vip === true) return true;
  const t = String(profile.account_type || '').toLowerCase();
  return t === 'vip' || t === 'premium';
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="block text-sm font-semibold text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ReadBox({ value, mono = false }) {
  return (
    <div
      className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value || '—'}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {children}
    </button>
  );
}

/**
 * Hồ sơ học sinh: Thông tin tài khoản / Cài đặt / VIP
 */
export default function StudentAccountSettings({
  studentName = '',
  studentClass = '',
  rosterGrade = '8',
  profile = null,
  onSaveProfile,
}) {
  const vip = isVipAccount(profile);
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [schoolQuery, setSchoolQuery] = useState('');

  const [form, setForm] = useState({
    phone: '',
    school: '',
    class_label: '',
    grade_level: '8',
    province: '',
    ward: '',
    address: '',
    notify_zalo: false,
    notify_email: true,
  });

  useEffect(() => {
    setForm({
      phone: profile?.phone || '',
      school: profile?.school || '',
      class_label: profile?.class_label || studentClass || '',
      grade_level: String(profile?.grade_level || rosterGrade || '8'),
      province: profile?.province || '',
      ward: profile?.ward || '',
      address: profile?.address || '',
      notify_zalo: profile?.notify_zalo === true,
      notify_email: profile?.notify_email !== false,
    });
    setSchoolQuery(profile?.school || '');
  }, [profile, studentClass, rosterGrade]);

  const displayEmail = profile?.email || '';
  const displayUsername = profile?.username || displayEmail || '—';
  const emailVerified = Boolean(profile?.email_verified || profile?.auth_provider === 'google.com');

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!onSaveProfile) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await onSaveProfile({
        phone: String(form.phone || '').trim(),
        school: String(form.school || schoolQuery || '').trim(),
        class_label: String(form.class_label || '').trim(),
        grade_level: String(form.grade_level || rosterGrade || '8').trim(),
        province: String(form.province || '').trim(),
        ward: String(form.ward || '').trim(),
        address: String(form.address || '').trim(),
        notify_zalo: Boolean(form.notify_zalo),
        notify_email: Boolean(form.notify_email),
      });
      setMessage('Đã lưu thông tin tài khoản.');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Không lưu được. Thử lại sau.');
    } finally {
      setSaving(false);
    }
  };

  const accountBadge = useMemo(() => {
    if (vip) {
      return {
        label: 'Tài khoản VIP',
        className: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    }
    return {
      label: 'Tài khoản miễn phí',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  }, [vip]);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-8 pt-6 pb-0 border-b border-slate-100">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Thông tin tài khoản</h2>
            <p className="text-sm text-slate-500 mt-1">
              Hồ sơ đăng ký · trường lớp · trạng thái VIP / miễn phí
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${accountBadge.className}`}>
            {vip ? <Crown className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
            {accountBadge.label}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto -mb-px">
          <TabBtn active={tab === 'info'} onClick={() => setTab('info')} icon={User}>
            Thông tin tài khoản
          </TabBtn>
          <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings}>
            Cài đặt tài khoản
          </TabBtn>
          <TabBtn active={tab === 'vip'} onClick={() => setTab('vip')} icon={Star}>
            Thông tin VIP
          </TabBtn>
        </div>
      </div>

      <div className="p-5 sm:p-8">
        {message && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-4 py-3">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3">
            {error}
          </div>
        )}

        {tab === 'info' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tên hiển thị">
                <ReadBox value={studentName || profile?.name} />
              </Field>
              <Field label="Tên đăng nhập">
                <ReadBox value={displayUsername} mono />
              </Field>
              <Field label="Email">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[12rem]">
                    <ReadBox value={displayEmail || '—'} mono />
                  </div>
                  {displayEmail ? (
                    emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" /> Đã xác thực
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded-lg">
                        <XCircle className="w-4 h-4" /> Chưa xác thực
                      </span>
                    )
                  ) : null}
                </div>
              </Field>
              <Field label="Số điện thoại">
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => patch('phone', e.target.value)}
                    placeholder="0968xxxxxx"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  />
                  <span className="p-2 rounded-lg border border-slate-200 text-slate-400" title="Chỉnh sửa">
                    <Pencil className="w-4 h-4" />
                  </span>
                </div>
              </Field>
              <Field label="Mật khẩu">
                <div className="flex items-center gap-2">
                  <ReadBox value="*********" mono />
                  <span className="text-xs text-slate-500 shrink-0">Đổi mật khẩu qua email đăng ký</span>
                </div>
              </Field>
              <Field label="Loại tài khoản">
                <ReadBox value={vip ? 'VIP' : 'Thường (miễn phí)'} />
              </Field>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Khối học</p>
                <p className="font-bold text-slate-900 mt-1">Toán {form.grade_level || rosterGrade}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Lớp</p>
                <p className="font-bold text-slate-900 mt-1">{form.class_label || studentClass || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Trường</p>
                <p className="font-bold text-slate-900 mt-1 truncate">{form.school || '—'}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving || !onSaveProfile}
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Chọn tỉnh/thành phố">
                <select
                  value={form.province}
                  onChange={(e) => patch('province', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Vui lòng chọn giá trị</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Chọn xã/phường">
                <input
                  type="text"
                  value={form.ward}
                  onChange={(e) => patch('ward', e.target.value)}
                  placeholder="Nhập xã/phường"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>
              <Field label="Tìm trường học:" className="md:col-span-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={schoolQuery}
                    onChange={(e) => {
                      setSchoolQuery(e.target.value);
                      patch('school', e.target.value);
                    }}
                    placeholder="Nhập vào tên trường"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    type="button"
                    onClick={() => patch('school', schoolQuery.trim())}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-sky-400 text-sky-700 font-bold text-sm hover:bg-sky-50"
                  >
                    <Search className="w-4 h-4" /> Tìm
                  </button>
                </div>
              </Field>
              <Field label="Chọn / xác nhận trường">
                <input
                  type="text"
                  value={form.school}
                  onChange={(e) => {
                    patch('school', e.target.value);
                    setSchoolQuery(e.target.value);
                  }}
                  placeholder="Tên trường đang học"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>
              <Field label="Lớp (vd. 9A1)">
                <input
                  type="text"
                  value={form.class_label}
                  onChange={(e) => patch('class_label', e.target.value)}
                  placeholder="9A1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>
              <Field label="Khối học">
                <select
                  value={form.grade_level}
                  onChange={(e) => patch('grade_level', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Địa chỉ (tuỳ chọn)" className="md:col-span-2">
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => patch('address', e.target.value)}
                  placeholder="Số nhà, đường..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />
              </Field>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-600 mb-2">Nhận thông báo MathEdu:</p>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.notify_zalo}
                    onChange={(e) => patch('notify_zalo', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Qua Zalo
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.notify_email}
                    onChange={(e) => patch('notify_email', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Qua Email
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                disabled={saving || !onSaveProfile}
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </div>
          </div>
        )}

        {tab === 'vip' && (
          <div className="space-y-5">
            <div
              className={`rounded-2xl border p-5 ${
                vip
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    vip ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-black text-lg text-slate-900">
                    {vip ? 'Bạn đang dùng tài khoản VIP' : 'Bạn đang dùng tài khoản miễn phí'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {vip
                      ? 'Mở khóa đầy đủ chuyên đề, đề kiểm tra và lộ trình nâng cao.'
                      : 'Nâng cấp VIP để học chuyên đề ôn tập không giới hạn và nhận ưu đãi gia sư.'}
                  </p>
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                Bài giảng & lộ trình theo khối — miễn phí
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${vip ? 'text-emerald-500' : 'text-slate-300'}`} />
                Chuyên đề ôn tập & đề kiểm tra đầy đủ — VIP
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${vip ? 'text-emerald-500' : 'text-slate-300'}`} />
                Ưu tiên hỗ trợ & học thử gia sư — VIP
              </li>
            </ul>

            {!vip && (
              <a
                href="tel:0968526800"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-black hover:bg-orange-600"
              >
                Liên hệ nâng cấp VIP — 0968 526 800
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { isVipAccount };
