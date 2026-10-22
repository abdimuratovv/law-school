import type { CSSProperties, ReactNode } from 'react';

/** Stroke icons lifted 1:1 from the design artboards (24×24, 1.8 stroke via `.i`). */
const paths = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></>,
  logo: <><path d="M12 4v16M7 20h10M5 7.5h14" /><path d="M5 7.5 2.8 13a2.6 2.6 0 0 0 4.4 0zM19 7.5 16.8 13a2.6 2.6 0 0 0 4.4 0z" /></>,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  forward: <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  down: <path d="m6 9.5 6 6 6-6" />,
  up: <path d="m6 14.5 6-6 6 6" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  flag: <><path d="M5.5 21V4.5" /><path d="M5.5 4.5h11l-2.2 4 2.2 4h-11" /></>,
  flagFill: <><path d="M5.5 21V4.5" /><path d="M5.5 4.5h11l-2.2 4 2.2 4h-11z" /></>,
  map: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></>,
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  tests: <><rect x="5" y="3.5" width="14" height="17" rx="3" /><path d="M9 8.5h6M9 12h6M9 15.5h3.5" /></>,
  progress: <><path d="M4 19.5h16" /><path d="M6 16l4-5 3.5 3L19 7" /></>,
  profile: <><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" /></>,
  bookmark: <path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" />,
  bookmarkPlus: <><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" /><path d="M12 7.5v6M9 10.5h6" /></>,
  bookmarkCheck: <><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z" /><path d="m9.3 10 2 2 3.5-3.6" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10h16" /></>,
  calendarFull: <><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  telegram: <><path d="M20.5 3.8 3.5 10.6l6.4 2.6 2.6 6.4z" /><path d="m9.9 13.2 5-5" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  cloudCheck: <><path d="M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.5a4.5 4.5 0 0 0 0 9z" /><path d="m9.5 13.8 1.8 1.8 3.4-3.4" /></>,
  device: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 17.5h2" /></>,
  wifiOff: <><path d="M3.5 3.5l17 17" /><path d="M8.5 16.2a5 5 0 0 1 7 0M5.2 12.8a9.6 9.6 0 0 1 4-2.3M14.6 10.3a9.6 9.6 0 0 1 4.2 2.5M2 9.3a14.5 14.5 0 0 1 5.3-3M11 5.5c4 0 7.9 1.4 11 3.8" /></>,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  shift: <path d="M12 4.5 4.5 12.5H9v6.5h6v-6.5h4.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  plusSm: <path d="M12 6v12M6 12h12" />,
  minus: <path d="M6 12h12" />,
  download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19.5h14" /></>,
  upload: <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" /></>,
  pencil: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  users: <><circle cx="9" cy="9" r="3.3" /><path d="M3.5 19c.9-3 3-4.5 5.5-4.5s4.6 1.5 5.5 4.5" /><path d="M15.5 6a3 3 0 0 1 0 6M17 14.7c1.7.6 3 1.9 3.5 4.3" /></>,
  bars: <path d="M5 20V11M10 20V5M15 20v-7M20 20v-4" />,
  gauge: <><path d="M4.5 16a7.5 7.5 0 1 1 15 0" /><path d="M12 16l3.5-4" /></>,
  builder: <><rect x="5" y="4.5" width="14" height="16" rx="3" /><path d="M9 11h6M9 15h4M9.5 3.5h5" /></>,
  warning: <><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4M12 16.8v.1" /></>,
  errorCircle: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></>,
  alertCircle: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.3v.1" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.8L16.2 9.5" /></>,
  dashedCircle: <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />,
  halfCircle: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17z" style={{ fill: 'currentColor' }} /><circle cx="12" cy="12" r="8.5" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c5 0 8.5 4.5 9.5 6-.5.8-1.6 2.2-3 3.5M6.6 7.6C4.6 9 3.1 11 2.5 12c1 1.5 4.5 6 9.5 6 1.6 0 3-.4 4.3-1.1" /></>,
  dots: <><circle cx="6" cy="12" r=".8" /><circle cx="12" cy="12" r=".8" /><circle cx="18" cy="12" r=".8" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  external: <path d="M8 16 16 8M9.5 8H16v6.5" />,
  book: <path d="M12 4v16M7 20h10M5 7.5h14" />,
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  listNum: <path d="M10 7h10M10 12h10M10 17h10M4.5 6h1v3M4 17h2.5l-2.5 2h2.5" />,
  indent: <path d="M10 7h10M10 12h10M10 17h10M4 9.5l3 2.5-3 2.5" />,
  comment: <path d="M5 18.5V6.5A2 2 0 0 1 7 4.5h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9z" />,
  excel: <><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="m8.5 9 7 6M15.5 9l-7 6" /></>,
  x: <path d="M7 7l10 10M17 7 7 17" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  moon: <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />,
  logout: <><path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" /><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15" /></>,
  layers: <><path d="m12 4 8.5 4.5L12 13 3.5 8.5z" /><path d="m3.5 12.5 8.5 4.5 8.5-4.5" /></>
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

interface IconProps {
  name: IconName;
  size?: 'xs' | 's' | 'l';
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

export function Icon({ name, size, fill, className, style, label }: IconProps) {
  const cls = ['i', size, fill ? 'fill' : '', className].filter(Boolean).join(' ');
  return (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      style={style}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {paths[name]}
    </svg>
  );
}
