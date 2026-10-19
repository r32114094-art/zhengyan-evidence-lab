import {env} from 'cloudflare:workers';
import {analyze,validateInput} from '@/lib/research';
import {reviewWithModel,type ModelEnv} from '@/lib/model';
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'请求来源不匹配。'},{status:403});
 try{const raw=await req.text();if(raw.length>8000)return Response.json({error:'请求过长。'},{status:413});const result=analyze(validateInput(JSON.parse(raw)));const ai=await reviewWithModel(result,env as ModelEnv);return Response.json({...result,ai,mode:ai.status==='success'?`本地模型辅助 · ${ai.model}`:'规则验证 · 模型未参与'},{headers:{'Cache-Control':'no-store'}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'请求格式错误。'},{status:400});}
}
