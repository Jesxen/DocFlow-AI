import { downloadCsv, downloadJson } from '../export';

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-700">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-800 break-words">{value || <em className="text-slate-400">—</em>}</span>
    </div>
  );
}

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] || tones.slate}`}>{children}</span>;
}

function List({ items }) {
  if (!items || items.length === 0) return <p className="text-sm text-slate-400">None found.</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
      {items.map((it, i) => (
        <li key={i} className="break-words">{it}</li>
      ))}
    </ul>
  );
}

function InvoiceView({ d }) {
  return (
    <div className="space-y-4">
      <Card title="Summary">
        <Field label="Vendor" value={d.vendor} />
        <Field label="Date" value={d.date} />
        <Field label="Subtotal" value={d.subtotal} />
        <Field label="Tax" value={d.tax} />
        <Field label="Total" value={d.total} />
      </Card>
      <Card title="Line Items">
        {d.items && d.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Unit Price</th>
                  <th className="py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-800">{it.description}</td>
                    <td className="py-2 pr-3 text-slate-600">{it.qty}</td>
                    <td className="py-2 pr-3 text-slate-600">{it.unitPrice}</td>
                    <td className="py-2 text-slate-800">{it.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No line items found.</p>
        )}
      </Card>
    </div>
  );
}

function ContractView({ d }) {
  return (
    <div className="space-y-4">
      <Card title="Summary">
        <p className="text-sm leading-relaxed text-slate-800">{d.summary || <em className="text-slate-400">—</em>}</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Parties"><List items={d.parties} /></Card>
        <Card title="Key Dates">
          {d.keyDates && d.keyDates.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-800">
              {d.keyDates.map((kd, i) => (
                <li key={i}><span className="font-medium">{kd.label}:</span> {kd.date}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">None found.</p>
          )}
        </Card>
      </div>
      <Card title="Obligations"><List items={d.obligations} /></Card>
      <Card title="Risk Flags">
        {d.riskFlags && d.riskFlags.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {d.riskFlags.map((rf, i) => (
              <li key={i} className="flex items-start gap-2">
                <Pill tone={rf.severity}>{rf.severity}</Pill>
                <span className="text-slate-800">{rf.note}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No risks flagged.</p>
        )}
      </Card>
    </div>
  );
}

function EmailView({ d }) {
  const c = d.contactInfo || {};
  return (
    <div className="space-y-4">
      <Card title="Overview">
        <Field label="Intent" value={d.senderIntent} />
        <Field label="Category" value={d.category} />
        <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span className="w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">Urgency</span>
          <Pill tone={d.urgencyLevel}>{d.urgencyLevel || '—'}</Pill>
        </div>
        <Field label="Next Action" value={d.suggestedNextAction} />
      </Card>
      <Card title="Contact">
        <Field label="Name" value={c.name} />
        <Field label="Email" value={c.email} />
        <Field label="Phone" value={c.phone} />
      </Card>
    </div>
  );
}

function GenericView({ d }) {
  return (
    <div className="space-y-4">
      <Card title="Summary">
        <p className="text-sm leading-relaxed text-slate-800">{d.summary || <em className="text-slate-400">—</em>}</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Key Entities"><List items={d.keyEntities} /></Card>
        <Card title="Dates"><List items={d.dates} /></Card>
        <Card title="Numbers"><List items={d.numbers} /></Card>
        <Card title="Action Items"><List items={d.actionItems} /></Card>
      </div>
    </div>
  );
}

// Renders just the per-type extracted view (no header/export buttons).
// Reused by both the single-document Results and the batch result cards.
export function ResultView({ docType, data }) {
  if (!data) return null;
  let View = GenericView;
  if (docType === 'invoice') View = InvoiceView;
  else if (docType === 'contract') View = ContractView;
  else if (docType === 'email') View = EmailView;
  return <View d={data} />;
}

export default function Results({ docType, data }) {
  if (!data) return null;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-800">Extracted Data</h2>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCsv(docType, data)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => downloadJson(docType, data)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Export JSON
          </button>
        </div>
      </div>
      <ResultView docType={docType} data={data} />
    </div>
  );
}
