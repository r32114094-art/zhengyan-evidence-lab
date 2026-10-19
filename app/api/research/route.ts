import {analyze,validateInput} from '@/lib/research';
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'请求来源不匹配。'},{status:403});
 try{const raw=await req.text();if(raw.length>8000)return Response.json({error:'请求过长。'},{status:413});return Response.json(analyze(validateInput(JSON.parse(raw))),{headers:{'Cache-Control':'no-store'}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'请求格式错误。'},{status:400});}
}
