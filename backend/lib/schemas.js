// schemas.js
// Per-document-type extraction schemas (JSON Schema) used to force structured
// JSON output from Claude via tool-use. Each docType maps to:
//   - a tool name
//   - a human description
//   - an input_schema describing exactly the fields to extract
//
// Shared by both the local Express server and the Vercel serverless function.

const DOC_TYPES = ['invoice', 'contract', 'email', 'generic'];

const SCHEMAS = {
  invoice: {
    toolName: 'extract_invoice',
    description:
      'Extract structured data from an invoice or receipt document.',
    input_schema: {
      type: 'object',
      properties: {
        vendor: { type: 'string', description: 'Vendor / seller / merchant name. Empty string if not found.' },
        date: { type: 'string', description: 'Invoice or receipt date as written in the document. Empty string if not found.' },
        items: {
          type: 'array',
          description: 'Line items on the invoice.',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Item description.' },
              qty: { type: 'string', description: 'Quantity as written (string to preserve formatting).' },
              unitPrice: { type: 'string', description: 'Unit price as written.' },
              amount: { type: 'string', description: 'Line total amount as written.' },
            },
            required: ['description', 'qty', 'unitPrice', 'amount'],
          },
        },
        subtotal: { type: 'string', description: 'Subtotal amount. Empty string if not found.' },
        tax: { type: 'string', description: 'Tax amount. Empty string if not found.' },
        total: { type: 'string', description: 'Grand total amount. Empty string if not found.' },
      },
      required: ['vendor', 'date', 'items', 'subtotal', 'tax', 'total'],
    },
  },

  contract: {
    toolName: 'extract_contract',
    description: 'Extract structured data from a contract or legal agreement.',
    input_schema: {
      type: 'object',
      properties: {
        parties: {
          type: 'array',
          description: 'Names of the parties to the contract.',
          items: { type: 'string' },
        },
        keyDates: {
          type: 'array',
          description: 'Important dates referenced in the contract.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'What the date refers to (e.g. Effective Date, Termination).' },
              date: { type: 'string', description: 'The date as written.' },
            },
            required: ['label', 'date'],
          },
        },
        obligations: {
          type: 'array',
          description: 'Key obligations or responsibilities of the parties.',
          items: { type: 'string' },
        },
        riskFlags: {
          type: 'array',
          description: 'Potential risks, unusual clauses, or items needing attention.',
          items: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Risk severity.' },
              note: { type: 'string', description: 'Description of the risk.' },
            },
            required: ['severity', 'note'],
          },
        },
        summary: { type: 'string', description: 'A concise plain-language summary of the contract.' },
      },
      required: ['parties', 'keyDates', 'obligations', 'riskFlags', 'summary'],
    },
  },

  email: {
    toolName: 'extract_email',
    description: 'Extract structured data from an email or sales lead message.',
    input_schema: {
      type: 'object',
      properties: {
        senderIntent: { type: 'string', description: 'What the sender wants / the purpose of the message.' },
        contactInfo: {
          type: 'object',
          description: 'Contact details of the sender if present.',
          properties: {
            name: { type: 'string', description: 'Sender name. Empty string if not found.' },
            email: { type: 'string', description: 'Sender email. Empty string if not found.' },
            phone: { type: 'string', description: 'Sender phone. Empty string if not found.' },
          },
          required: ['name', 'email', 'phone'],
        },
        urgencyLevel: { type: 'string', enum: ['low', 'medium', 'high'], description: 'How urgent the message is.' },
        suggestedNextAction: { type: 'string', description: 'Recommended next action to take.' },
        category: { type: 'string', description: 'Category / classification of the message (e.g. Sales Lead, Support, Spam).' },
      },
      required: ['senderIntent', 'contactInfo', 'urgencyLevel', 'suggestedNextAction', 'category'],
    },
  },

  generic: {
    toolName: 'extract_generic',
    description: 'Extract general structured data from an arbitrary document.',
    input_schema: {
      type: 'object',
      properties: {
        keyEntities: {
          type: 'array',
          description: 'Important named entities (people, organizations, products, places).',
          items: { type: 'string' },
        },
        dates: {
          type: 'array',
          description: 'Dates mentioned in the document.',
          items: { type: 'string' },
        },
        numbers: {
          type: 'array',
          description: 'Significant numbers or figures mentioned (amounts, quantities, IDs).',
          items: { type: 'string' },
        },
        summary: { type: 'string', description: 'A concise summary of the document.' },
        actionItems: {
          type: 'array',
          description: 'Action items or follow-ups implied by the document.',
          items: { type: 'string' },
        },
      },
      required: ['keyEntities', 'dates', 'numbers', 'summary', 'actionItems'],
    },
  },
};

function getSchema(docType) {
  return SCHEMAS[docType] || null;
}

module.exports = { DOC_TYPES, SCHEMAS, getSchema };
