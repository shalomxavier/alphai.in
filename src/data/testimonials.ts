export interface Testimonial {
  /** Display number, e.g. "01" */
  index: string;
  /** The endorsement itself */
  quote: string;
  name: string;
  role: string;
  company: string;
  /** Optional project/service reference shown as mono metadata */
  service?: string;
}

/**
 * PLACEHOLDER testimonials — every field below is invented scaffolding.
 * Replace with real client endorsements before launch.
 */
export const testimonials: Testimonial[] = [
  {
    index: '01',
    quote: 'PLACEHOLDER — replace with a real client quote.',
    name: 'CLIENT NAME',
    role: 'ROLE',
    company: 'COMPANY',
    service: 'SERVICE REFERENCE',
  },
  {
    index: '02',
    quote: 'PLACEHOLDER — replace with a real client quote.',
    name: 'CLIENT NAME',
    role: 'ROLE',
    company: 'COMPANY',
    service: 'SERVICE REFERENCE',
  },
  {
    index: '03',
    quote: 'PLACEHOLDER — replace with a real client quote.',
    name: 'CLIENT NAME',
    role: 'ROLE',
    company: 'COMPANY',
    service: 'SERVICE REFERENCE',
  },
];
