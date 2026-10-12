export interface Service {
  /** Display number, e.g. "01" */
  index: string;
  /** Service name — approved pillar title, rendered uppercase */
  title: string;
  /** Row destination — `/contact` until dedicated service pages exist */
  href: string;
  /** Optional short descriptor rendered under the title */
  summary?: string;
  /** Optional mono metadata shown beside the arrow (capability tag, status, etc.) */
  meta?: string;
}

/**
 * Approved service pillars. Each `href` currently points to `/contact`;
 * it can later become a dedicated page (`/services/x`) or section anchor
 * without component changes.
 */
export const services: Service[] = [
  {
    index: '01',
    title: 'WEB & DASHBOARD DEVELOPMENT',
    summary:
      'Custom websites, business platforms, dashboards and web applications enhanced with AI capabilities to make digital operations smarter and more efficient.',
    href: '/contact',
  },
  {
    index: '02',
    title: 'AI & BUSINESS AUTOMATION',
    summary:
      'AI-powered integrations and intelligent automation that reduce manual work, streamline workflows and improve business efficiency.',
    href: '/contact',
  },
  {
    index: '03',
    title: 'SEO & DIGITAL GROWTH',
    summary:
      'Search engine optimization, Google Ads and conversion-focused digital strategies that help businesses improve visibility and attract customers.',
    href: '/contact',
  },
];
