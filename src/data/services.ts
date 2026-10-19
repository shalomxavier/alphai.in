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
      'Websites, dashboards and custom business software enhanced with AI capabilities.',
    href: '/contact',
  },
  {
    index: '02',
    title: 'AI & BUSINESS AUTOMATION',
    summary:
      'AI-powered integrations and intelligent automation that reduce manual work and streamline workflows.',
    href: '/contact',
  },
  {
    index: '03',
    title: 'SEO & DIGITAL GROWTH',
    summary:
      'SEO, Google Ads and conversion-focused strategies that improve visibility and attract customers.',
    href: '/contact',
  },
];
