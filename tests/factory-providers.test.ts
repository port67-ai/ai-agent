import assert from 'node:assert/strict';
import {providerSelection, providerConfigured, safeProviderConfiguration, invokeProvider} from '../src/lib/factory/providers';
async function main(){
assert.throws(()=>providerSelection('research',{PORT67_RESEARCH_PROVIDER:'deepseek'}),/grounded/);
assert.equal(providerConfigured('synthesis',{}),false);
for(const provider of ['openai','anthropic','deepseek','gemini']){
 const env={PORT67_SYNTHESIS_PROVIDER:provider,PORT67_SYNTHESIS_MODEL:'model',PORT67_OPENAI_API_KEY:'secret',PORT67_ANTHROPIC_API_KEY:'secret',PORT67_DEEPSEEK_API_KEY:'secret',PORT67_GEMINI_API_KEY:'secret'};
 const selection=providerSelection('synthesis',env);
 assert.equal(JSON.stringify(safeProviderConfiguration(env)).includes('secret'),false);
 let calls=0;globalThis.fetch=async()=>{calls++;return Response.json(provider==='openai'?{id:'r',output:[{content:[{type:'output_text',text:'{}'}]}],usage:{input_tokens:12,output_tokens:3,input_tokens_details:{cached_tokens:2}}}:provider==='anthropic'?{id:'r',content:[{type:'text',text:'{}'}],usage:{input_tokens:10,output_tokens:3,cache_read_input_tokens:2,cache_creation_input_tokens:4}}:provider==='deepseek'?{id:'r',choices:[{message:{content:'{}'}}],usage:{prompt_tokens:12,completion_tokens:3,prompt_cache_hit_tokens:2}}:{candidates:[{content:{parts:[{text:'{}'}]}}],usageMetadata:{promptTokenCount:12,candidatesTokenCount:3,cachedContentTokenCount:2}})};
 const result=await invokeProvider(selection,{instructions:'safe',input:'data',schema:{type:'object'},name:'test'});
 if(provider==='anthropic') assert.equal(result.usage.cache_creation_input_tokens,4);assert.equal(result.text,'{}');assert.equal(result.usage.output_tokens,3);assert.equal(result.usage.cached_input_tokens,2);assert.equal(calls,1);
 globalThis.fetch=async()=>{calls++;return Response.json({error:{message:'secret'}},{status:429})};
 const failed=await invokeProvider(selection,{instructions:'safe',input:'data'});assert.match(failed.error!,/429/);assert.deepEqual(failed.usage,{});assert.equal(calls,2);
}
const selection=providerSelection('research',{PORT67_RESEARCH_PROVIDER:'gemini',PORT67_RESEARCH_MODEL:'gemini-2.5-flash',PORT67_GEMINI_API_KEY:'secret'});
globalThis.fetch=async(_url,options)=>{const body=JSON.parse(String(options?.body));assert.deepEqual(body.tools,[{google_search:{}}]);return Response.json({candidates:[{content:{parts:[{text:'grounded'}]},groundingMetadata:{webSearchQueries:['query'],groundingChunks:[{web:{uri:'https://example.com',title:'Evidence'}}]}}],responseId:'gemini-request',usageMetadata:{promptTokenCount:4,candidatesTokenCount:2,thoughtsTokenCount:3}})};
const grounded=await invokeProvider(selection,{instructions:'cite',input:'data',research:true});assert.equal(grounded.usage.tool_calls,1);assert.equal(grounded.usage.output_tokens,5);assert.equal(grounded.usage.reasoning_output_tokens,3);assert.equal(grounded.providerRequestId,'gemini-request');assert.equal(grounded.data?.candidates?.[0]?.groundingMetadata?.groundingChunks?.[0]?.web?.uri,'https://example.com');
globalThis.fetch=async()=>Response.json({output:[{type:'web_search_call'}]});
const noTokens=await invokeProvider({provider:'openai',model:'test',key:'secret'},{instructions:'cite',input:'data',research:true});assert.deepEqual(noTokens.usage,{tool_calls:1});
globalThis.fetch=async()=>{throw new Error('secret network details')};const failed=await invokeProvider(selection,{instructions:'cite',input:'data',research:true});assert.deepEqual(failed.usage,{});assert.equal(failed.error?.includes('secret'),false);
// Failures keep the provider's own explanation (credentials removed) and say whether a call timed out.
globalThis.fetch=async()=>Response.json({error:{message:'The model gpt-x does not exist or you do not have access. Key sk-abcdefghijklmnop leaked'}},{status:404});
const why=await invokeProvider({provider:'openai',model:'gpt-x',key:'secret'},{instructions:'cite',input:'data',research:true});assert.match(why.error!,/returned 404: The model gpt-x does not exist/);assert.equal(why.error!.includes('sk-abcdefghijklmnop'),false);assert.match(why.error!,/\[redacted\]/);
globalThis.fetch=async()=>{const e=new Error('boom');e.name='TimeoutError';throw e};
const slow=await invokeProvider({provider:'gemini',model:'m',key:'secret'},{instructions:'cite',input:'data',research:true});assert.match(slow.error!,/timed out after 100 seconds/);
globalThis.fetch=async()=>new Response('<html>Bad gateway</html>',{status:502});
const html=await invokeProvider({provider:'openai',model:'m',key:'secret'},{instructions:'x',input:'y'});assert.match(html.error!,/returned 502; no output accepted/);
globalThis.fetch=async()=>Response.json({usage:{input_tokens:100,output_tokens:5,cache_creation_input_tokens:20},content:[{type:'text',text:'{}'}]});
const creation=await invokeProvider({provider:'anthropic',model:'test',key:'secret'},{instructions:'safe',input:'test'});assert.equal(creation.usage.input_tokens,120);
globalThis.fetch=async()=>Response.json({usageMetadata:{promptTokenCount:10,candidatesTokenCount:2},candidates:[{content:{parts:[{text:'test'}]}}]});
const incomplete=await invokeProvider({provider:'gemini',model:'test',key:'secret'},{instructions:'safe',input:'test',research:true});assert.equal(incomplete.usage.tool_usage_unknown,1);
console.log('provider adapters passed');}
main().catch(e=>{console.error(e);process.exitCode=1});
