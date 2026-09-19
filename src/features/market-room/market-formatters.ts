import type {
  ChartRange,
  MarketCurrency,
  MarketDataSource,
  MarketSummaryItem,
} from '../../domain/market';

export function formatDataSource(source: MarketDataSource): string {
  const labels: Record<MarketDataSource, string> = { mock: '예시', naver: '네이버 금융', yahoo: 'Yahoo Finance' };
  return labels[source];
}

export function formatSummaryValue(item: MarketSummaryItem): string {
  if (item.unit === 'score') {
    return `${Math.round(item.value)} / 100`;
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: item.unit === 'exchange-rate' ? 1 : 2,
    maximumFractionDigits: 2,
  }).format(item.value);
}

export function formatPrice(value: number, currency: MarketCurrency): string {
  return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'KRW' ? 0 : 2,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

export function formatUpdatedAt(timestamp: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp));
}

export function formatChartTimestamp(timestamp: number, range: ChartRange): string {
  return new Intl.DateTimeFormat('en-US',
    range === '1D' || range === '1W'
      ? { hour: '2-digit', minute: '2-digit', hour12: false }
      : { month: 'short', day: 'numeric' },
  ).format(new Date(timestamp));
}
