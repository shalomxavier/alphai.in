export interface Service {
  /** Display number, e.g. "01" */
  index: string;
  /** Service name — currently a placeholder ("SERVICE 01") */
  title: string;
  /** Row destination — later a dedicated page (`/services/x`) or section anchor */
  href: string;
  /** Optional short descriptor rendered under the title */
  summary?: string;
  /** Optional mono metadata shown beside the arrow (capability tag, status, etc.) */
  meta?: string;
}

/**
 * Initial service pillars — brand copy, not final copy.
 * Destinations are placeholders; each `href` can later become a dedicated
 * page (`/services/x`) or section anchor without component changes.
 */
export const services: Service[] = [
  {
    index: '01',
    title: 'DIGITAL SYSTEMS',
    summary: 'Websites, dashboards & custom business software',
    href: '/about',
  },
  {
    index: '02',
    title: 'AI & GROWTH',
    summary: 'AI-powered automation, SEO & digital growth',
    href: '/about',
  },
  {
    index: '03',
    title: 'BUSINESS OPERATIONS',
    summary: 'Systems that simplify, connect & automate operations',
    href: '/about',
  },
];
