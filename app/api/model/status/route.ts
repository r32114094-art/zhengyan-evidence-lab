import {env} from 'cloudflare:workers';
import {getModelStatus,type ModelEnv} from '@/lib/model';
export async function GET(){return Response.json(await getModelStatus(env as ModelEnv),{headers:{'Cache-Control':'no-store'}});}
