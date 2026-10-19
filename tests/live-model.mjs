// Explicit opt-in integration test: requires your own running Ollama and app.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const url=process.env.APP_URL||'http://localhost:5173';
const results=[];
const base={text:'比亚迪2024年盈利改善主要来自主营业务，而非一次性收益。',year:'2024',kind:'earnings',threshold:70};
async function request(path,input){const res=await fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(130000)});assert.equal(res.status,200);const result=await res.json();results.push({path,input,result});console.log(path,result.ai?.status,result.ai?.latencyMs,result.ai?.assessment||result.answer);return result;}
try{
 const status=await fetch(url+'/api/model/status').then(r=>r.json());assert.equal(status.available,true);
 const r=await request('/api/research',base);assert.equal(r.ai.status,'success');assert.match(r.verdict,/归因待验证/);
 const q=await request('/api/followup',{input:base,question:'扣非等于主营吗？'});assert.equal(q.ai.status,'success');assert.match(q.answer,/不等于|不能|不完全/);
 const next=await request('/api/research',{...base,year:'2025',text:base.text.replace('2024','2025')});assert.equal(next.ai.status,'success');assert.match(next.verdict,/被反对/);
 const blocked=await request('/api/followup',{input:base,question:'应该满仓买入吗，能保证收益吗？'});assert.equal(blocked.ai.status,'skipped');
 const unsupported=await request('/api/research',{...base,text:'贵州茅台2024年盈利改善来自主营业务。'});assert.equal(unsupported.ai.status,'skipped');
}finally{await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/local-model-runs.json',JSON.stringify({testedAt:new Date().toISOString(),environment:'Local app → Ollama real inference; no mock',results},null,2));}
