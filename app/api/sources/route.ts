import {sources} from '@/lib/research';
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'请求来源不匹配。'},{status:403});
 let id:string;try{const body=await req.text();if(body.length>500)throw Error();id=JSON.parse(body).id;}catch{return Response.json({error:'来源参数无效。'},{status:400});}
 const s=sources.find(x=>x.id===id);if(!s)return Response.json({error:'未知来源；不接受任意URL。'},{status:400});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
 try{
  const response=await fetch(s.url,{signal:controller.signal,redirect:'manual',headers:{Accept:'application/pdf'}});
  if(!response.ok)throw Error(`原始站点返回 HTTP ${response.status}`);
  if(!response.headers.get('content-type')?.includes('pdf'))throw Error('原始站点未返回PDF，不能视为验证成功');
  const reader=response.body?.getReader();if(!reader)throw Error('上游响应为空');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>24*1024*1024){await reader.cancel();throw Error('原文超过24MB验证上限');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
  return Response.json({status:hash===s.sha256?'unchanged':'changed',id,sha256:hash,bytes:size,checkedAt:new Date().toISOString(),message:hash===s.sha256?'原文内容与已核验快照一致。此操作不抓取新的报告或行情。':'原文内容发生变化，请暂停沿用快照并重新核验数值。'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({status:'unavailable',id,error:e instanceof Error&&e.name==='AbortError'?'原文站点请求超时，请稍后重试。':e instanceof Error?e.message:'原文暂不可用',snapshotRetained:true},{status:502,headers:{'Cache-Control':'no-store'}});}
 finally{clearTimeout(timer);}
}
