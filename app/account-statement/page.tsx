'use client';

import { useEffect, useState } from 'react';

interface StatementData {
  customerName: string;
  generatedDate: string;
  consignmentDateFrom: string;
  consignmentDateTo: string;
  excludeGalaxy: boolean;
  excludeOnlyBill: boolean;
  kpi: {
    expectedTotal: number;
    expectedRTGS: number;
    expectedCASH: number;
    receivedRTGS: number;
    receivedCASH: number;
    receivedTotal: number;
    oldDueAmount: number;
    waivedAmount: number;
    totalReceivables: number;
  };
  oldDueNotes: string | null;
  waivedTransactions: Array<{ id: string; amount: number; waived_date: string; notes: string | null }>;
  consignments: Array<{
    date: string;
    total: number;
    rtgs_expected: number;
    cash_expected: number;
    remarks: string | null;
    entry_type: string | null;
  }>;
  transactions: Array<{
    date: string;
    mode: string;
    amount: number;
    account_name: string;
    note: string | null;
  }>;
}

function fmtDate(d: string) {
  if (!d) return '-';
  try {
    const [y, m, day] = d.split('-');
    return `${day}-${m}-${y}`;
  } catch { return d; }
}

function fmtAmt(n: number) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

export default function AccountStatementPage() {
  const [data, setData] = useState<StatementData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('account_statement_data');
      if (!raw) { setError('No statement data found. Please use the Account Statement button from the dashboard.'); return; }
      setData(JSON.parse(raw));
    } catch {
      setError('Failed to load statement data.');
    }
  }, []);

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow text-center max-w-md">
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  const totalReceived = data.kpi.receivedRTGS + data.kpi.receivedCASH;
  const pendingRTGS = data.kpi.expectedRTGS - data.kpi.receivedRTGS;
  const pendingCash = data.kpi.expectedCASH - data.kpi.receivedCASH;

  const rtgsTxns = data.transactions.filter(t => t.mode === 'RTGS');
  const cashTxns = data.transactions.filter(t => t.mode === 'CASH');

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; background: #f3f4f6; color: #1f2937; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        .wrap { max-width: 900px; margin: 0 auto; padding: 16px; }
        .toolbar { background: #1f2937; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; border-radius: 8px; margin-bottom: 14px; }
        .print-btn { background: #f97316; color: #fff; border: none; padding: 9px 22px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .print-btn:hover { background: #ea580c; }
        .hint { color: #9ca3af; font-size: 11px; }
        .doc { background: #fff; padding: 28px 28px 20px; border-radius: 10px; box-shadow: 0 2px 14px rgba(0,0,0,.08); }

        /* ── header ── */
        .hdr { display: flex; flex-direction: column; align-items: center; text-align: center; padding-bottom: 14px; border-bottom: 3px solid #f97316; margin-bottom: 18px; }
        .h-title { font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: .6px; margin-top: 4px; }
        .h-cust { font-size: 28px; font-weight: 800; color: #111; margin-top: 0; }
        .h-meta { font-size: 10px; color: #6b7280; margin-top: 1px; }
        .ftag { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 3px; padding: 1px 6px; font-size: 9px; color: #4b5563; display: inline-block; margin-top: 3px; margin-right: 3px; }

        /* ── KPI table ── */
        .kpi-tbl { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .kpi-tbl th { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; padding: 8px 12px; text-align: right; border-bottom: 2px solid #d1d5db; color: #374151; background: #f9fafb; }
        .kpi-tbl th:first-child { text-align: left; }
        .kpi-tbl td { padding: 10px 12px; font-size: 15px; font-weight: 700; text-align: right; border-bottom: 1px solid #e5e7eb; }
        .kpi-tbl td:first-child { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #4b5563; text-align: left; }
        .kpi-tbl tr.inv td.rtgs { color: #1d4ed8; background: #eff6ff; }
        .kpi-tbl tr.inv td.cash { color: #15803d; background: #f0fdf4; }
        .kpi-tbl tr.inv td.total { color: #374151; background: #f9fafb; }
        .kpi-tbl tr.rec td.rtgs { color: #1d4ed8; background: #dbeafe; }
        .kpi-tbl tr.rec td.cash { color: #15803d; background: #dcfce7; }
        .kpi-tbl tr.rec td.total { color: #7e22ce; background: #faf5ff; }
        .kpi-tbl tr.pend td.rtgs { color: #c2410c; background: #fff7ed; }
        .kpi-tbl tr.pend td.cash { color: #c2410c; background: #fff7ed; }
        .kpi-tbl tr.pend td.total { color: #b91c1c; background: #fef2f2; }

        /* ── summary boxes (stacked below KPI) ── */
        .sum-row { display: flex; gap: 24px; align-items: center; margin-bottom: 20px; }
        .sum-box { border-radius: 8px; padding: 12px 16px; }
        .sum-box .sb-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
        .sum-box .sb-val { font-size: 20px; font-weight: 800; margin-top: 3px; }
        .sb-orange { background: none; border: none; padding: 4px 0; color: #92400e; }
        .sb-orange .sb-lbl { font-size: 9px; font-weight: 600; color: #6b7280; letter-spacing: .4px; }
        .sb-orange .sb-val { font-size: 16px; font-weight: 700; color: #d97706; }
        .sb-red { background: #fef2f2; border: 2px solid #fca5a5; color: #b91c1c; box-shadow: 0 2px 8px rgba(185,28,28,.12); }
        .sb-red .sb-lbl { font-size: 11px; }
        .sb-red .sb-val { font-size: 30px; }

        /* ── section labels ── */
        .slbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: #fff; padding: 5px 12px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
        .sl-orange { background: #ea580c; }
        .sl-blue { background: #2563eb; }
        .sl-green { background: #16a34a; }

        /* ── divider ── */
        .hr { height: 1px; background: #e5e7eb; margin: 18px 0; }

        /* ── tables ── */
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead tr { background: #1f2937; color: #fff; }
        th { padding: 7px 8px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: .2px; white-space: nowrap; }
        th.r { text-align: right; }
        td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
        td.r { text-align: right; }
        td.amt { text-align: right; font-weight: 700; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        .tr-total { background: #1f2937 !important; color: #fff; font-weight: 700; }
        .tr-total td { padding: 7px 8px; border-bottom: none; }
        .tr-total td.r { text-align: right; }

        /* ── payment section ── */
        .pay-section { margin-bottom: 0; }
        .pay-pair-tbl { width: 100%; border-collapse: collapse; font-size: 10px; }
        .pay-pair-tbl thead tr { background: #374151; color: #fff; }
        .pay-pair-tbl th { padding: 4px 6px; font-size: 9px; font-weight: 600; white-space: nowrap; }
        .pay-pair-tbl th.r { text-align: right; }
        .pay-pair-tbl td { padding: 2px 6px; font-size: 10px; line-height: 1.35; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
        .pay-pair-tbl td.amt { text-align: right; font-weight: 700; }
        .pay-pair-tbl td.r { text-align: right; }
        .pay-pair-tbl tbody tr:nth-child(even) { background: #f9fafb; }
        .pay-pair-tbl .tr-total { background: #1f2937 !important; color: #fff; font-weight: 700; }
        .pay-pair-tbl .tr-total td { padding: 4px 6px; border-bottom: none; font-size: 10px; }
        .pay-pair-tbl .col-sep { border-left: 2px solid #d1d5db; }
        /* Slightly larger legible styles specifically for the cash table */
        .cash-pair td { font-size: 11px; padding: 4px 8px; line-height: 1.4; }
        .cash-pair th { font-size: 10px; padding: 6px 8px; }
        .pay-pair-tbl td.empty { background: #f9fafb; border-bottom: 1px solid #f0f0f0; }

        /* ── footer ── */
        .foot { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; color: #9ca3af; font-size: 9px; }

        /* ── PRINT ── */
        @media print {
          html, body { height: auto !important; overflow: visible !important; }
          body { background: #fff; font-size: 11px; }
          .toolbar { display: none !important; }
          .wrap { padding: 0; max-width: 100%; overflow: visible !important; height: auto !important; }
          .doc { box-shadow: none; padding: 16px; border-radius: 0; overflow: visible !important; height: auto !important; }
          .kpi-tbl td { padding: 6px 8px; font-size: 13px; }
          .kpi-tbl th { padding: 5px 8px; font-size: 10px; }
          .sum-box .sb-val { font-size: 16px; }
          .pay-pair-tbl td { padding: 1px 5px; font-size: 8.5px; line-height: 1.2; }
          .pay-pair-tbl th { padding: 3px 5px; font-size: 8px; }
          .pay-pair-tbl .tr-total td { padding: 3px 5px; font-size: 8.5px; }
          /* print sizes for cash table slightly larger for readability */
          .cash-pair td { font-size: 9.5px; padding: 2px 6px; line-height: 1.25; }
          .cash-pair th { font-size: 8.5px; padding: 3px 6px; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
          .hdr { break-inside: avoid; }
          .kpi-tbl { break-inside: avoid; }
          .sum-row { break-inside: avoid; }
          table { page-break-inside: auto; }
          @page { margin: 1.2cm; size: A4; }
        }

        @media (max-width: 650px) {
          .sum-row { flex-direction: column; }
        }
      `}</style>

      <div className="wrap">
        <div className="toolbar">
          <span className="hint">Uncheck "Headers and footers" · Enable "Background graphics" in print settings</span>
          <button className="print-btn" onClick={() => window.print()}>⬇ Download PDF</button>
        </div>

        <div className="doc">
          {/* ── Header ── */}
          <div className="hdr">
            <div className="h-cust">{data.customerName}</div>
            <div className="h-title">Account Statement</div>
            <div className="h-meta">Generated: {fmtDate(data.generatedDate)}</div>
            {(data.consignmentDateFrom || data.consignmentDateTo) && (
              <div className="h-meta">
                Period: {data.consignmentDateFrom ? fmtDate(data.consignmentDateFrom) : 'Start'} → {data.consignmentDateTo ? fmtDate(data.consignmentDateTo) : 'Today'}
              </div>
            )}
            {(data.excludeGalaxy || data.excludeOnlyBill) && (
              <div style={{ marginTop: 3 }}>
                {data.excludeGalaxy && <span className="ftag">Galaxy Excl.</span>}
                {data.excludeOnlyBill && <span className="ftag">Only Bill Excl.</span>}
              </div>
            )}
          </div>

          {/* ── KPI Summary Table ── */}
          <table className="kpi-tbl">
            <thead>
              <tr>
                <th></th>
                <th style={{ textAlign: 'right' }}>RTGS (₹)</th>
                <th style={{ textAlign: 'right' }}>Cash (₹)</th>
                <th style={{ textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="inv">
                <td>Invoiced</td>
                <td className="rtgs">{fmtAmt(data.kpi.expectedRTGS)}</td>
                <td className="cash">{fmtAmt(data.kpi.expectedCASH)}</td>
                <td className="total">{fmtAmt(data.kpi.expectedTotal)}</td>
              </tr>
              <tr className="rec">
                <td>Received</td>
                <td className="rtgs">{fmtAmt(data.kpi.receivedRTGS)}</td>
                <td className="cash">{fmtAmt(data.kpi.receivedCASH)}</td>
                <td className="total">{fmtAmt(totalReceived)}</td>
              </tr>
              <tr className="pend">
                <td>Pending</td>
                <td className="rtgs">{fmtAmt(pendingRTGS)}</td>
                <td className="cash">{fmtAmt(pendingCash)}</td>
                <td className="total">{fmtAmt(data.kpi.expectedTotal - totalReceived)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Previous Due + Total Outstanding ── */}
          <div className="sum-row">
            {data.kpi.oldDueAmount > 0 && (
              <div className="sum-box sb-orange">
                <div className="sb-lbl">Previous Due (carried forward)</div>
                <div className="sb-val">{fmtAmt(data.kpi.oldDueAmount)}</div>
              </div>
            )}
            <div className="sum-box sb-red">
              <div className="sb-lbl">Total Outstanding Receivables</div>
              <div className="sb-val">{fmtAmt(data.kpi.totalReceivables)}</div>
            </div>
          </div>

          <div className="hr" />

          {/* ── Consignments (full width) ── */}
          <div style={{ marginBottom: 18 }}>
            <div className="slbl sl-orange">Consignments — {data.consignments.length} records</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 28 }}>#</th>
                  <th>Date</th>
                  <th className="r">Total (₹)</th>
                  <th className="r">RTGS (₹)</th>
                  <th className="r">Cash (₹)</th>
                </tr>
              </thead>
              <tbody>
                {data.consignments.map((c, i) => (
                  <tr key={i}>
                    <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                    <td>{fmtDate(c.date)}</td>
                    <td className="amt">{fmtAmt(c.total)}</td>
                    <td className="r" style={{ color: '#1d4ed8' }}>{fmtAmt(c.rtgs_expected)}</td>
                    <td className="r" style={{ color: '#15803d' }}>{fmtAmt(c.cash_expected)}</td>
                  </tr>
                ))}
                <tr className="tr-total">
                  <td colSpan={2}>Total — {data.consignments.length} entries</td>
                  <td className="r">{fmtAmt(data.kpi.expectedTotal)}</td>
                  <td className="r">{fmtAmt(data.kpi.expectedRTGS)}</td>
                  <td className="r">{fmtAmt(data.kpi.expectedCASH)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="hr" />

          {/* ── RTGS & Cash Payments ── */}
          <div>
            {/* RTGS — full width, single entry per row */}
            <div style={{ marginBottom: 18 }}>
              <div className="slbl sl-blue">RTGS Payments — {rtgsTxns.length}</div>
              <table className="pay-pair-tbl cash-pair">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>#</th>
                    <th style={{ width: 90 }}>Date</th>
                    <th className="r" style={{ width: 130 }}>Amount (₹)</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {rtgsTxns.map((t, i) => (
                    <tr key={i}>
                      <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                      <td>{fmtDate(t.date)}</td>
                      <td className="amt" style={{ color: '#1d4ed8' }}>{fmtAmt(t.amount)}</td>
                      <td style={{ color: '#4b5563' }}>{t.account_name || '-'}</td>
                    </tr>
                  ))}
                  <tr className="tr-total">
                    <td colSpan={2}>Total — {rtgsTxns.length} entries</td>
                    <td className="r">{fmtAmt(data.kpi.receivedRTGS)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="hr" />

            {/* Cash — full width, 3 entries per row */}
            <div>
              <div className="slbl sl-green">Cash Payments — {cashTxns.length}</div>
              <table className="pay-pair-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 18 }}>#</th>
                    <th style={{ width: 72 }}>Date</th>
                    <th className="r" style={{ width: 88 }}>Amt (₹)</th>
                    <th>Account</th>
                    <th className="col-sep" style={{ width: 18 }}>#</th>
                    <th style={{ width: 72 }}>Date</th>
                    <th className="r" style={{ width: 88 }}>Amt (₹)</th>
                    <th>Account</th>
                    <th className="col-sep" style={{ width: 18 }}>#</th>
                    <th style={{ width: 72 }}>Date</th>
                    <th className="r" style={{ width: 88 }}>Amt (₹)</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const numRows = Math.ceil(cashTxns.length / 3);
                    return Array.from({ length: numRows }).map((_, r) => {
                      const a = cashTxns[r];
                      const b = cashTxns[r + numRows];
                      const c = cashTxns[r + numRows * 2];
                      return (
                        <tr key={r}>
                          <td style={{ color: '#9ca3af' }}>{r + 1}</td>
                          <td>{fmtDate(a.date)}</td>
                          <td className="amt" style={{ color: '#15803d' }}>{fmtAmt(a.amount)}</td>
                          <td style={{ color: '#4b5563' }}>{a.account_name || '-'}</td>
                          {b ? (
                            <>
                              <td className="col-sep" style={{ color: '#9ca3af' }}>{r + numRows + 1}</td>
                              <td>{fmtDate(b.date)}</td>
                              <td className="amt" style={{ color: '#15803d' }}>{fmtAmt(b.amount)}</td>
                              <td style={{ color: '#4b5563' }}>{b.account_name || '-'}</td>
                            </>
                          ) : (
                            <td colSpan={4} className="empty"></td>
                          )}
                          {c ? (
                            <>
                              <td className="col-sep" style={{ color: '#9ca3af' }}>{r + numRows * 2 + 1}</td>
                              <td>{fmtDate(c.date)}</td>
                              <td className="amt" style={{ color: '#15803d' }}>{fmtAmt(c.amount)}</td>
                              <td style={{ color: '#4b5563' }}>{c.account_name || '-'}</td>
                            </>
                          ) : (
                            <td colSpan={4} className="empty"></td>
                          )}
                        </tr>
                      );
                    });
                  })()}
                  <tr className="tr-total">
                    <td colSpan={3}>Total — {cashTxns.length} entries</td>
                    <td colSpan={9} className="r">{fmtAmt(data.kpi.receivedCASH)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="foot">
            <span>{data.customerName} — Account Statement</span>
            <span>Generated {fmtDate(data.generatedDate)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

