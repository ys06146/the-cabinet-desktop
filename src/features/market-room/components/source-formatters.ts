import type { StockQuote } from '../../../domain/market';

export function formatSourceTime(value: string | null | undefined): string {
  if (!value) return '아직 확인하지 않음';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '시각 정보 없음';
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }).format(date);
}

export function marketSourceLabel(source: StockQuote['source']): string {
  if (source === 'naver') return '네이버 금융';
  if (source === 'yahoo') return 'Yahoo Finance';
  return '예시 데이터';
}

export function marketDelayLabel(delayMinutes?: number): string {
  if (delayMinutes === undefined) return '제공 시점 지연 미확인';
  return delayMinutes > 0 ? `약 ${delayMinutes}분 지연` : '제공처 지연 표기 0분';
}

export function marketSessionLabel(quote: StockQuote): string {
  const state = { open: '장중', closed: '장 마감', pre: '프리마켓', post: '시간외', unknown: '거래 상태 미확인' }[quote.marketState ?? 'unknown'];
  const session = quote.session === 'pre' ? ' · 프리마켓 가격' : quote.session === 'post' ? ' · 시간외 가격' : '';
  return state + session;
}
