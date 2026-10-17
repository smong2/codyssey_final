export function isVerifiedAccountSession(value) {
  return Boolean(value && typeof value.uid === 'string' && value.uid.trim() &&
    typeof value.email === 'string' && value.email.trim() && value.emailVerified === true);
}

export function accountErrorMessage(error, context = 'login') {
  const code = String(error?.code ?? error?.message ?? '').toLowerCase();
  if (context === 'signup' && /already[-_ ]?in[-_ ]?use|email-already-in-use|account-exists/.test(code)) return '이미 사용 중인 이메일입니다.';
  if (/invalid[-_ ]?email|email[-_ ]?invalid/.test(code)) return '이메일 형식을 확인해주세요.';
  if (/wrong[-_ ]?password|invalid[-_ ]?credential|user[-_ ]?not[-_ ]?found|invalid[-_ ]?login/.test(code)) return context === 'reauth' ? '현재 비밀번호를 확인해주세요.' : '이메일 또는 비밀번호를 확인해주세요.';
  if (/requires[-_ ]?recent[-_ ]?login|reauth[-_ ]?required/.test(code)) return '보안을 위해 현재 비밀번호를 다시 입력해주세요.';
  if (/weak[-_ ]?password|password[-_ ]?too[-_ ]?short/.test(code)) return '비밀번호는 8자 이상으로 입력해주세요.';
  if (/email[-_ ]?not[-_ ]?verified/.test(code)) return '이메일 인증이 필요합니다.';
  return '잠시 후 다시 시도해주세요.';
}

export function displayCreatedAt(value) {
  if (!value) return '미등록';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '미등록';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}
