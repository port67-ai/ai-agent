import type { Provider } from "./providers";
// Choose one current API-listed ID per useful family. Stable aliases preferred over snapshots and preview where possible.
export function curatedModels(provider: Provider, ids: string[], research = false): string[] {
  const families: Record<Provider, RegExp[]> = {
    openai: [/^gpt-\d+(?:\.\d+)?$/, /^gpt-\d+(?:\.\d+)?-mini$/, /^gpt-\d+(?:\.\d+)?-pro$/],
    gemini: [/^gemini-\d+(?:\.\d+)?-pro(?:-preview)?$/, /^gemini-\d+(?:\.\d+)?-flash(?:-preview)?$/, /^gemini-\d+(?:\.\d+)?-flash-lite(?:-preview)?$/],
    anthropic: [/^claude-opus-\d+(?:-\d+)?$/, /^claude-sonnet-\d+(?:-\d+)?$/, /^claude-haiku-\d+(?:-\d+)?$/],
    deepseek: [/^deepseek-chat$/, /^deepseek-reasoner$/],
  };
  const version = (s: string) => (s.match(/\d+/g)||[]).slice(0,2).map(Number);
  const sorted = [...new Set(ids)].sort((a,b) => { const x=version(a),y=version(b); return (y[0]||0)-(x[0]||0)||(y[1]||0)-(x[1]||0)||Number(a.includes("preview"))-Number(b.includes("preview")); });
  const chosen = families[provider].map(re => sorted.find(id => re.test(id))).filter((id): id is string => !!id);
  return ids.filter(id => chosen.includes(id) && !(research && /-pro$/.test(id) && provider === "openai")).filter((id,i,a)=>a.indexOf(id)===i);
}
export function modelUse(id: string): string {
  if (/opus|reasoner|-pro(?:-preview)?$/.test(id)) return "Deep reasoning / creative thinking";
  if (/sonnet/.test(id)) return "Creative writing / balanced";
  if (/-mini(?:$|-)|flash-lite|haiku/.test(id)) return "Fast / economical";
  if (/flash/.test(id)) return "Research / fast synthesis";
  return "General writing / structured output";
}
