// Document type definitions for the tab selector. Must stay in sync with the
// backend schemas (backend/lib/schemas.js).
export const DOC_TYPES = [
  { id: 'invoice', label: 'Invoice / Receipt', hint: 'Vendor, items, totals' },
  { id: 'contract', label: 'Contract', hint: 'Parties, dates, risks' },
  { id: 'email', label: 'Email / Lead', hint: 'Intent, contact, urgency' },
  { id: 'generic', label: 'Generic', hint: 'Entities, dates, summary' },
];
