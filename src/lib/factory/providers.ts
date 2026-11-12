export type Provider = 'openai' | 'anthropic' | 'deepseek' | 'gemini';
export type ProviderStage = 'research' | 'synthesis';
type Env = Record<string,string|undefined>;
export type ProviderSelection = {provider:Provider;model:string;key:string};
export const keyNames = {openai:'PORT67_OPENAI_API_KEY',anthropic:'PORT67_ANTHROPIC_API_KEY',deepseek:'PORT67_DEEPSEEK_API_KEY',gemini:'PORT67_GEMINI_API_KEY'};
export function providerSelection(stage:ProviderStage,env:Env=process.env):ProviderSelection {
 const provider=env[`PORT67_${stage.toUpperCase()}_PROVIDER`] || 'openai';
 if(!Object.hasOwn(keyNames,provider)) throw new Error('Unsupported AI provider');
 if(stage==='research' && provider!=='openai' && provider!=='gemini') throw new Error('Research requires a grounded web search provider (openai or gemini)');
 const model=env[`PORT67_${stage.toUpperCase()}_MODEL`] || (stage==='synthesis' && provider===(env.PORT67_RESEARCH_PROVIDER || 'openai') ? env.PORT67_RESEARCH_MODEL : undefined);
 const key=env[keyNames[provider as Provider]];
 if(!model || !/^[a-zA-Z0-9._:/-]{1,180}$/.test(model) || !key?.trim()) throw new Error(`AI ${stage} provider requires a model and API key`);
 return {provider:provider as Provider,model,key};
}
export function providerConfigured(stage:ProviderStage,env:Env=process.env){try{providerSelection(stage,env);return true}catch{return false}}
export function safeProviderConfiguration(env:Env=process.env){return (['research','synthesis'] as const).map(stage=>({stage,provider:env[`PORT67_${stage.toUpperCase()}_PROVIDER`] || 'openai',model:env[`PORT67_${stage.toUpperCase()}_MODEL`] || '',configured:providerConfigured(stage,env)}))}
type ProviderData = {
 output?: {type?:string;content?: {type?:string;text?:string;annotations?: {type?:string;url?:string;title?:string}[]}[]}[];
 candidates?: {content?:{parts?:{text?:string}[]};groundingMetadata?:{groundingChunks?:{web?:{uri?:string;title?:string}}[];webSearchQueries?:string[]}}[];
};
export type ProviderResult={text:string;usage:Record<string,number>;rawUsage?:unknown;providerRequestId?:string;data?:ProviderData;error?:string;provider:Provider;model:string}; // Provider JSON is inspected defensively at the boundary.
export async function invokeProvider(s:ProviderSelection,request:{instructions:string;input:string;schema?:unknown;name?:string;research?:boolean}):Promise<ProviderResult>{
 const {provider,model,key}=s;const headers:Record<string,string>={'content-type':'application/json'};let url:string;let body:Record<string,unknown>;
 if(request.research && provider!=='openai' && provider!=='gemini') throw new Error('Research requires grounded web search');
 if(provider==='openai') {url='https://api.openai.com/v1/responses';headers.authorization=`Bearer ${key}`;body={model,store:false,max_output_tokens:request.research?1800:3000,instructions:request.instructions,input:request.input,...(request.research?{tools:[{type:'web_search',search_context_size:'low'}]}:{}),...(request.schema?{text:{format:{type:'json_schema',name:request.name,strict:true,schema:request.schema}}}:{})};}
 else if(provider==='anthropic'){url='https://api.anthropic.com/v1/messages';headers['x-api-key']=key;headers['anthropic-version']='2023-06-01';body={model,max_tokens:3000,system:request.instructions,messages:[{role:'user',content:request.input}],...(request.schema?{output_config:{format:{type:'json_schema',schema:request.schema}}}:{})};}
 else if(provider==='deepseek'){url='https://api.deepseek.com/chat/completions';headers.authorization=`Bearer ${key}`;body={model,max_tokens:3000,messages:[{role:'system',content:request.instructions+(request.schema?' Return a JSON object matching this schema: '+JSON.stringify(request.schema):'')},{role:'user',content:request.input}],...(request.schema?{response_format:{type:'json_object'}}:{})};}
 else{url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;headers['x-goog-api-key']=key;body={systemInstruction:{parts:[{text:request.instructions}]},contents:[{role:'user',parts:[{text:request.input}]}],generationConfig:{maxOutputTokens:request.research?1800:3000,...(request.schema?{responseMimeType:'application/json',responseJsonSchema:request.schema}:{})},...(request.research?{tools:[{google_search:{}}]}:{})};}
 const result:ProviderResult={provider,model,text:'',usage:{}};
 try{
 const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 const data=await response.json();result.providerRequestId=typeof data.id==='string'?data.id:typeof data.responseId==='string'?data.responseId:response.headers.get('x-request-id') || undefined;
 const u=data.usage || data.usageMetadata;result.rawUsage=u;
 if(u && typeof u==='object'){
 const put=(k:string,v:unknown)=>{if(typeof v==='number' && Number.isFinite(v) && v>=0)result.usage[k]=v};
 put('input_tokens',u.input_tokens ?? u.prompt_tokens ?? u.promptTokenCount);put('output_tokens',u.output_tokens ?? u.completion_tokens ?? (typeof u.candidatesTokenCount==='number' ? u.candidatesTokenCount+(typeof u.thoughtsTokenCount==='number' ? u.thoughtsTokenCount : 0) : undefined));put('reasoning_output_tokens',u.thoughtsTokenCount);put('cache_creation_input_tokens',u.cache_creation_input_tokens);put('cached_input_tokens',u.input_tokens_details?.cached_tokens ?? u.cache_read_input_tokens ?? u.prompt_cache_hit_tokens ?? u.cachedContentTokenCount);
 if(provider==='anthropic' && typeof u.input_tokens==='number')result.usage.input_tokens=u.input_tokens+(u.cache_read_input_tokens || 0)+(u.cache_creation_input_tokens || 0);

 }
 if(Array.isArray(data.output))result.usage.tool_calls=data.output.filter((x:{type?:string})=>x.type==='web_search_call').length;
 if(data.candidates?.[0]?.groundingMetadata?.webSearchQueries)result.usage.tool_calls=data.candidates[0].groundingMetadata.webSearchQueries.length;
 if(request.research && result.usage.tool_calls===undefined)result.usage.tool_usage_unknown=1;
 if(!response.ok){result.error=`AI provider returned ${response.status}; no output accepted`;return result;}
 result.data=data;
 result.text=provider==='openai'?(data.output || []).flatMap((x:{content?:unknown[]})=>x.content || []).filter((x:{type?:string})=>x.type==='output_text').map((x:{text?:string})=>x.text || '').join(''):provider==='anthropic'?(data.content || []).filter((x:{type?:string})=>x.type==='text').map((x:{text?:string})=>x.text || '').join(''):provider==='deepseek'?data.choices?.[0]?.message?.content || '':(data.candidates?.[0]?.content?.parts || []).map((x:{text?:string})=>x.text || '').join('');
 }catch{result.error='AI provider request failed; usage unknown unless reported';}
 return result;
}
