import {env} from 'cloudflare:workers';
import {analyze,followup,guardrail,validateInput} from '@/lib/research';
import {reviewWithModel,type ModelEnv} from '@/lib/model';
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'请求来源不匹配。'},{status:403});
 try{const raw=await req.text();if(raw.length>8000)throw Error('请求过长。');const body=JSON.parse(raw);if(typeof body.question!=='string'||!body.question.trim()||body.question.length>300)throw Error('追问需要1–300个字。');const result=analyze(validateInput(body.input));const fallback=followup(result,body.question);if(guardrail(body.question)||!result.scopeSupported)return Response.json({...fallback,mode:'边界规则',ai:{status:'skipped'}},{headers:{'Cache-Control':'no-store'}});const ai=await reviewWithModel(result,env as ModelEnv,body.question);return Response.json(ai.status==='success'?{answer:ai.assessment,citations:ai.evidenceIds,mode:`模型回答 · ${ai.model}`,ai}:{...fallback,mode:'规则回答',ai},{headers:{'Cache-Control':'no-store'}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'请求格式错误。'},{status:400});}
}
