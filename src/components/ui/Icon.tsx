import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'assistant'
  | 'bookmark'
  | 'close'
  | 'collapse'
  | 'game'
  | 'market'
  | 'menu'
  | 'note'
  | 'search'
  | 'settings'
  | 'update';

const iconPaths: Record<IconName, ReactNode> = {
  assistant: (
    <>
      <path d="M8 4.5 9.2 7.8 12.5 9l-3.3 1.2L8 13.5l-1.2-3.3L3.5 9l3.3-1.2L8 4.5Z" />
      <path d="m16.5 12 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </>
  ),
  bookmark: <path d="M6 4.5h12v15l-6-3.8-6 3.8v-15Z" />,
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  collapse: (
    <>
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <path d="M9 4v16" />
      <path d="m15 9-3 3 3 3" />
    </>
  ),
  game: (
    <>
      <rect height="14" rx="3" width="18" x="3" y="5" />
      <path d="M8 9v6M5 12h6" />
      <path d="M16 10.5h.01M18.5 13.5h.01" />
    </>
  ),
  market: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  note: (
    <>
      <path d="M6 3.5h9l3 3V20H6V3.5Z" />
      <path d="M14 3.5V8h4M9 12h6M9 15.5h6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3.1h5l.4-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z" />
    </>
  ),
  update: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.1 7a7 7 0 0 1 11.5-1.2L20 9" />
      <path d="M17.9 17a7 7 0 0 1-11.5 1.2L4 15" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: IconName;
}

export function Icon({ name, className = 'size-5', ...props }: IconProps): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}
