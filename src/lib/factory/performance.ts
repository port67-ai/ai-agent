import type { Project } from './model';
import { CHANNELS } from './channels';
import { FORMATS } from './formats';
export type PerformanceInput = { campaign: string; channel: string; format: string; objective: string; audience: string; offer: string; start: string; end: string; provenance: string; attribution: string; currency: string; impressions?: number; clicks?: number; conversions?: number; spend?: number; revenue?: number; publicAuthorised: boolean };
export type PerformanceRecord = PerformanceInput & { id: string; status: 'pending' | 'accepted' | 'rejected'; createdAt: string; createdBy: string; reviewedAt?: string; reviewedBy?: string; reviewReason?: string };
const counts = ['impressions','clicks','conversions'] as const;
const metrics = [...counts,'spend','revenue'] as const;
export function validatePerformance(raw: Record<string, unknown>): PerformanceInput {
  const out: Record<string, unknown> = {};
  for (const name of ['campaign','channel','format','objective','audience','offer','start','end','provenance','attribution','currency']) {
    if (typeof raw[name] !== 'string' || !(raw[name] as string).trim() || (raw[name] as string).length > 600) throw new Error(`Performance ${name} is required and must be at most 600 characters`);
    out[name] = (raw[name] as string).trim();
  }
  if (!CHANNELS.some(c => c.id === out.channel) || !FORMATS.some(f => f.id === out.format)) throw new Error('Unknown performance channel or format');
  for (const name of ['start','end']) if (!/^\d{4}-\d{2}-\d{2}$/.test(String(out[name])) || !Number.isFinite(Date.parse(String(out[name]))) || new Date(String(out[name])).toISOString().slice(0,10) !== out[name]) throw new Error('Invalid performance date');
  if (String(out.start) > String(out.end) || String(out.end) > new Date().toISOString().slice(0,10)) throw new Error('Invalid performance period dates');
  if (!/^[A-Z]{3}$/.test(String(out.currency))) throw new Error('Currency needs an uppercase three-letter code');
  for (const name of metrics) {
    if (raw[name] === undefined || raw[name] === '') continue;
    const n = typeof raw[name] === 'number' ? raw[name] : typeof raw[name] === 'string' && /^\d+(\.\d+)?$/.test(raw[name]) ? Number(raw[name]) : NaN;
    if (!Number.isFinite(n) || n < 0 || n > 1e12 || ((counts as readonly string[]).includes(name) && !Number.isSafeInteger(n))) throw new Error(`Invalid performance ${name}`);
    out[name] = n;
  }
  if (!metrics.some(name => out[name] !== undefined)) throw new Error('At least one observed metric is required');
  // Different event definitions can legitimately make conversions exceed clicks; never silently repair imported counts.
  out.publicAuthorised = raw.publicAuthorised === true;
  return out as PerformanceInput;
}
export function performanceMetrics(r: PerformanceInput) {
  const ratio = (n: number | undefined, d: number | undefined) => n !== undefined && d !== undefined && d > 0 ? n / d : null;
  return { ctr: ratio(r.clicks,r.impressions), conversionRate: ratio(r.conversions,r.clicks), cpc: ratio(r.spend,r.clicks), cpa: ratio(r.spend,r.conversions), roas: ratio(r.revenue,r.spend) };
}
/** Project-local only: no business-name joins, sibling accounts or unreviewed observations. */
export function performanceHistory(p: Pick<Project,'performance'>) {
  return (p.performance || []).filter(r => r.status === 'accepted' && r.publicAuthorised).slice(-30).map(r => ({ id:r.id, reviewNotes:r.reviewReason || "", campaign:r.campaign, channel:r.channel, format:r.format, objective:r.objective, audience:r.audience, offer:r.offer, start:r.start, end:r.end, provenance:r.provenance, attribution:r.attribution, currency:r.currency, impressions:r.impressions, clicks:r.clicks, conversions:r.conversions, spend:r.spend, revenue:r.revenue, metrics:performanceMetrics(r), limitation:'Producer-reviewed supplied observation; not independently verified or proof of causal or incremental performance.' }));
}
export function parsePerformanceCsv(csv: string): PerformanceInput[] {
  if (typeof csv !== 'string' || csv.length > 25000) throw new Error('CSV exceeds 25000 characters');
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false;
  for (let i=0;i<csv.length;i++) {
    const c=csv[i];
    if (quoted) { if(c==='"') { if(csv[i+1]==='"'){cell+='"';i++;} else {quoted=false;closed=true;} } else cell+=c; }
    else if(c==='"') { if(cell || closed) throw new Error('Invalid CSV quote'); quoted=true; }
    else if(c===',' || c==='\n' || c==='\r') { row.push(cell);cell='';closed=false; if(c!==','){ if(c==='\r'&&csv[i+1]==='\n')i++; if(row.some(Boolean))rows.push(row);row=[]; } }
    else { if(closed) throw new Error('Invalid CSV after closing quote'); cell+=c; }
  }
  if(quoted) throw new Error('Unterminated CSV quote');
  row.push(cell);if(row.some(Boolean))rows.push(row);
  const header=rows.shift()?.map(x=>x.trim().replace(/^\uFEFF/,'')) || [];
  const allowed=['campaign','channel','format','objective','audience','offer','start','end','provenance','attribution','currency',...metrics];
  if(!header.length || new Set(header).size!==header.length || header.some(h=>!allowed.includes(h)))throw new Error('Invalid CSV headers');
  if(!rows.length || rows.length>30)throw new Error('CSV needs 1 to 30 result rows');
  return rows.map((r,i)=>{if(r.length!==header.length)throw new Error(`CSV row ${i+2} has the wrong column count`);return validatePerformance(Object.fromEntries(header.map((h,j)=>[h,r[j]])));});
}
/** Browser-safe non-authorisation freshness fingerprint. Actual provider payloads are
 * independently SHA-256 hashed on the server; reports are not duplicated in every key. */
export function performanceContextKey(p: Pick<Project,'performance'>): string {
  const input=JSON.stringify(performanceHistory(p));let a=0x811c9dc5,b=0x9e3779b9;
  for(let i=0;i<input.length;i++){const c=input.charCodeAt(i);a=Math.imul(a^c,0x01000193);b=Math.imul(b^c,0x85ebca6b);}
  return `${(a>>>0).toString(16)}-${(b>>>0).toString(16)}-${input.length}`;
}
