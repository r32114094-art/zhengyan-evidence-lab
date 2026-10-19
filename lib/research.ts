import data from '../data/financials.json' with {type:'json'};
export type Thesis={text:string;year:string;kind:'earnings'|'valuation'|'supply';threshold:number};
export type Evidence={id:string;side:'support'|'oppose'|'unknown';title:string;observation:string;interpretation:string;sourceId?:string;page?:number;formula?:string;limitation:string};
export type Result={id:string;createdAt:string;input:Thesis;revised:string;verdict:string;summary:string;evidence:Evidence[];conflicts:string[];triggers:string[];metrics:{label:string;value:string;change:string}[];mode:string;scopeSupported:boolean;questions:string[];fingerprint:string};
export const sources=data.sources;
export const financials=data.annual;
export const examples=[
 {name:'盈利质量',text:'比亚迪2024年盈利改善主要来自主营业务，而非一次性收益。',kind:'earnings'},
 {name:'估值与基本面',text:'比亚迪2024年估值回落，但基本面未恶化。',kind:'valuation'},
 {name:'产业链传导',text:'原材料价格下降，是比亚迪2024年汽车毛利率改善的主要原因。',kind:'supply'}
] as const;
export function detectKind(text:string):Thesis['kind']{return /估值|市盈率|PE|便宜/i.test(text)?'valuation':/原材料|锂价|产业链|成本下降/.test(text)?'supply':'earnings';}
export function validateInput(body:unknown):Thesis{
 if(!body||typeof body!=='object')throw Error('请输入需要验证的命题。');
 const b=body as Record<string,unknown>;
 if(typeof b.text!=='string'||b.text.trim().length<6||b.text.length>600)throw Error('命题需要 6–600 个字。');
 if(!['2024','2025'].includes(String(b.year)))throw Error('当前只收录2024、2025年度研究。');
 if(!['earnings','valuation','supply'].includes(String(b.kind)))throw Error('请选择命题类型。');
 if(typeof b.threshold!=='number'||!Number.isFinite(b.threshold)||b.threshold<50||b.threshold>100)throw Error('主要贡献阈值需在50%–100%之间。');
 return {text:b.text.trim(),year:String(b.year),kind:b.kind as Thesis['kind'],threshold:b.threshold};
}
export function scopeIssue(t:Thesis){
 if(!/比亚迪|002594|BYD/i.test(t.text))return '当前验证库仅覆盖比亚迪（002594），此主体未匹配，不能套用示例公司的证据。';
 if(/茅台|宁德|特斯拉|贵州|腾讯|苹果|阿里/.test(t.text))return '此命题包含其他公司，跨公司比较的证据尚未收录。';
 if(t.kind!==detectKind(t.text))return '命题类型与文本不一致，请选择匹配类型或修订文本。';
 if(t.kind==='earnings'&&!/盈利改善|盈利增长|利润增长|盈利.*主要来自主营/.test(t.text))return '此表述超出当前规则覆盖范围。可参考盈利改善模板，或先保存为待研究问题。';
 if(t.kind==='earnings'&&/未改善|没有.*改善|没有.*增长|未增长|不.*改善/.test(t.text))return '当前规则验证正向盈利改善命题，不能将否定表述套入同一结论。请修订为待检验的正向命题。';
 if(t.kind==='earnings'&&/主要来自一次性|主要来自非经常|不是主营|并非主营|而非主营/.test(t.text))return '当前模板验证主要来自主营的正向假设，不能把相反命题套入同一判断。请明确修订研究假设。';
 const years:string[]=t.text.match(/20\d{2}/g)||[];
 if(years.length&&!years.includes(t.year))return `命题年份与选择的${t.year}年不一致，请修订后再验证。`;
 if(/半年|季度|Q[1-4]|H[12]|2026|今年|现在|当前|最新|今日|实时/i.test(t.text))return '当前只支持完整年度历史研究，不能验证季度、最新行情或当前表现。';
 return null;
}
export function guardrail(text:string){return /内幕|未公开|操纵|拉盘|保本|稳赚|保证收益|买入价|卖出价|满仓|买多少|仓位|明天.*涨|荐股/.test(text)?'仅验证公开研究事实，不提供内幕信息、保证收益、交易指令或个性化仓位建议。请改为验证盈利、现金流或估值事实。':null;}
export const pct=(a:number,b:number)=>b===0?null:(a/b-1)*100;
export const fmtPct=(v:number|null)=>v===null?'不可计算':`${v>=0?'+':''}${v.toFixed(2)}%`;
export const yi=(v:number)=>(v/1e8).toFixed(2);
export function analyze(t:Thesis):Result{
 const issue=scopeIssue(t)||guardrail(t.text);
 const questions=t.kind==='earnings'?['盈利是否改善？','扣非增量是否解释大部分净利增量？','现金流是否同步改善？','主营分部是否改善？','是否具备严格的主营归因？','能否延续至下一报告期？']:t.kind==='valuation'?['估值是否回落？','价格与盈利分母是否可比？','盈利是否恶化？','现金流是否恶化？','行业估值是否可比？','哪些证据仍缺失？']:['毛利率是否改善？','会计口径是否一致？','实际采购成本是否下降？','降本如何传导到毛利？','是否存在其他解释？','是否有量化利润桥？'];
 const r:Result={id:crypto.randomUUID(),createdAt:new Date().toISOString(),input:t,revised:`以比亚迪${t.year}年合并年度报表，对比${Number(t.year)-1}年可比口径，验证：${t.text}`,verdict:'无法验证',summary:issue||'',evidence:[],conflicts:[],triggers:[],metrics:[],mode:'规则验证 · 未调用大模型',scopeSupported:!issue,questions,fingerprint:`BYD-${t.year}-public-filings-v1`};
 if(issue){r.evidence=[{id:'U0',side:'unknown',title:'范围或合规边界未通过',observation:issue,interpretation:'不生成公司财务判断。',limitation:'请调整命题，或保存为待补充研究任务。'}];return r;}
 const c=data.annual[t.year as '2024'|'2025'],p=data.annual[String(Number(t.year)-1) as '2023'|'2024'];
 const profitDelta=c.profit-p.profit,adjDelta=c.adjustedProfit-p.adjustedProfit,share=profitDelta>0&&adjDelta>0?adjDelta/profitDelta*100:null;
 const up=profitDelta>0,cash=pct(c.operatingCashFlow,p.operatingCashFlow),sid=c.sourceId,segment=t.year==='2024'?25:30;
 r.metrics=[{label:'归母净利润',value:`${yi(c.profit)} 亿`,change:fmtPct(pct(c.profit,p.profit))},{label:'扣非归母净利润',value:`${yi(c.adjustedProfit)} 亿`,change:fmtPct(pct(c.adjustedProfit,p.adjustedProfit))},{label:'经营现金流净额',value:`${yi(c.operatingCashFlow)} 亿`,change:fmtPct(cash)}];
 r.evidence.push({id:'E1',side:up?'support':'oppose',title:up?'盈利改善的前提成立':'盈利改善的前提不成立',observation:`归母净利润 ${yi(p.profit)} → ${yi(c.profit)} 亿元，同比 ${fmtPct(pct(c.profit,p.profit))}；扣非利润同比 ${fmtPct(pct(c.adjustedProfit,p.adjustedProfit))}。`,interpretation:up?'报告口径盈利与扣非盈利同时增长。':'归母与扣非利润下降，不能沿用上一年度的盈利改善判断。',sourceId:sid,page:11,formula:'同比 =（本期 ÷ 上期 − 1）× 100%；元 ÷ 100,000,000 = 亿元',limitation:'同比变化不能单独证明利润的业务来源。'});
 if(t.kind==='earnings')r.evidence.push({id:'E2',side:share!==null&&share>=t.threshold?'support':share===null?'oppose':'unknown',title:share===null?'增长贡献占比不适用':`扣非利润增量占比 ${share.toFixed(2)}%`,observation:share===null?'归母利润没有正增长，不计算正向增长贡献占比。':`扣非净利增加 ${yi(adjDelta)} 亿元，归母净利增加 ${yi(profitDelta)} 亿元；${share>=t.threshold?'达到':'未达到'}“主要贡献”阈值 ${t.threshold}%。`,interpretation:share!==null&&share>=t.threshold?'支持“列入非经常性损益的项目不是主要增量来源”；仅为主营归因的代理指标。':'尚不能据此支持主要来自主营的盈利增长。',sourceId:sid,page:11,formula:share===null?'归母净利增量≤0，不计算正向增长贡献比率':`(${c.adjustedProfit} − ${p.adjustedProfit}) ÷ (${c.profit} − ${p.profit}) × 100%`,limitation:'扣非利润不等于主营业务利润，也不代表剔除了所有政府补助。'});
 r.evidence.push({id:'E3',side:(cash??-1)>=0?'support':'oppose',title:(cash??0)<0?'现金流未同步改善':'经营现金流同步增长',observation:`经营现金流净额 ${yi(p.operatingCashFlow)} → ${yi(c.operatingCashFlow)} 亿元，同比 ${fmtPct(cash)}。`,interpretation:'对“盈利质量全面改善”构成反向线索；并不直接否定主营利润增长。',sourceId:sid,page:11,formula:'经营现金流同比 =（本期 ÷ 上期 − 1）× 100%',limitation:'经营现金流受营运资本与结算时点影响，也不是自由现金流。'});
 r.evidence.push({id:'E4',side:c.autoMargin>p.autoMargin?'support':'oppose',title:'汽车分部的可比毛利率',observation:`汽车及相关业务毛利率 ${p.autoMargin.toFixed(2)}% → ${c.autoMargin.toFixed(2)}%，变化 ${(c.autoMargin-p.autoMargin).toFixed(2)} 个百分点。`,interpretation:'提供分部盈利能力的交叉印证；不能直接等同归母净利变化。',sourceId:sid,page:segment,formula:'百分点变化 = 本期毛利率 − 同报告上期可比毛利率',limitation:'2023采用2024年报重分类后的可比值21.02%，不能直接拼接原报。'});
 const unknowns=t.kind==='earnings'?[
 ['扣非不能完成严格主营归因','尚缺销量、售价、产品结构、补助与费用逐项连接归母净利的完整利润桥。','代理指标支持有限结论，不能升级为主营因果已证实。','需补充完整利润桥和补助分类明细。'],
 ['下一报告期仍需新证据',`本次研究只使用${t.year}年及此前可比年度的已核验数据。`,'切换年度会形成新的验证；保留原结论及其时间边界。','历史研究不能代表当前表现或未来回报。']
 ]:t.kind==='valuation'?[
 ['缺少同口径估值序列','未接入A股复权价格、股本与TTM盈利序列。','无法验证估值回落；股价下跌不等于估值下降。','需要两个明确观察日，统一A/H股、币种、复权和分母。'],
 ['缺少同业与历史分位','未收录可比公司的估值数据。','不判断合理价格、便宜程度或投资收益。','证据缺失不等于估值没有变化。']
 ]:[
 ['原材料成本到利润的传导未验证','缺少匹配采购时点的实际成本、库存和套期保值数据。','相关性不构成原材料降价为主要原因的证明。','需量化价格、销量、结构、汇率和单位成本。'],
 ['销量与产品结构是替代解释','现有证据不能单独识别原材料成本变化的净贡献。','保留替代解释，不把同期变化写成因果。','需要可比口径的定量利润桥。']
 ];
 unknowns.forEach(([title,observation,interpretation,limitation],i)=>r.evidence.push({id:`U${i+1}`,side:'unknown',title,observation,interpretation,limitation}));
 if(t.kind==='earnings'){
 r.verdict=!up?'核心前提被反对':share!==null&&share>=t.threshold?'部分支持 · 归因待验证':'证据不足';
 r.summary=!up?`${t.year}年归母与扣非利润均下降，“盈利改善”的前提不成立。应先修订命题，再研究利润下降的原因。`:`${t.year}年扣非利润增量解释约${share?.toFixed(2)}%的归母净利增量，支持“非经常性项目并非主要增量来源”。但扣非并不等于主营，现金流与严格归因仍需单独验证。`;
 }else if(t.kind==='valuation'){r.verdict='关键证据缺失';r.summary='财报可以检查部分基本面，但不能证明估值回落。现金流下降也使“基本面未恶化”的表述过强；需要补齐同口径估值序列。';}
 else{r.verdict='因果证据不足';r.summary='可核对汽车分部毛利率，但不能证明原材料降价为主要原因。应分别验证采购成本、产品结构、销量与会计重分类。';}
 if(t.kind==='earnings'&&t.year==='2024'){const u=r.evidence.find(e=>e.id==='U1');if(u){u.observation+=' 2024年计入损益政府补助总额106.60亿元，而非经常性补助为37.81亿元，口径不同。';u.sourceId='BYD-2024-CNINFO';u.page=250;u.formula='总补助10,659,878千元 × 1,000 / 100,000,000 = 106.60亿元；非经常补助参见同报告第12页。';}}
 r.conflicts=['利润与现金流属于不同指标。方向差异应保留，不能投票或平均成一个“可信度分数”。','2024年质量保证费用从销售费用改列营业成本。毛利率使用同一份年报中的上期可比值。','巨潮与港交所转载的是同一发行人的报告，属于一个证据家族，不算两份独立证据。'];
 r.triggers=[`归母或扣非利润转为下降时，撤回“盈利改善”的前提。`,`完整利润桥显示主营贡献低于${t.threshold}%时，撤回“主要来自主营”的归因。`,'回款与营运资本附注解释现金流差异，且后续改善时，降低现金转换疑虑。','公告更正、重述或原文内容变化时，暂停沿用当前数值并重新核验。'];
 if(t.kind==='valuation')r.triggers.unshift('补齐两个观察日的同口径估值与盈利分母后，重新验证估值回落。');
 if(t.kind==='supply')r.triggers.unshift('获得原材料净贡献的可比利润桥后，重新评估主要因果关系。');
 return r;
}
export function followup(r:Result,q:string):{answer:string;citations:string[]}{
 const g=guardrail(q);if(g)return {answer:g,citations:[]};
 if(!r.scopeSupported)return {answer:'研究范围尚未通过，不能追加公司财务判断。请先修订命题。',citations:[]};
 if(/现金|回款/.test(q))return {answer:r.evidence.find(e=>e.id==='E3')?.observation+' 利润按权责发生制确认，现金流受收付款时点影响。这是盈利质量的风险线索，不能直接否定主营增长；下一步需核对营运资本。',citations:['E3']};
 if(/扣非|主营|补助/.test(q))return {answer:'扣非利润不等于主营利润，也不代表剔除了所有补助。与日常经营相关且满足分类规则的补助可能仍影响扣非利润。严格归因需要完整利润桥。',citations:['U1']};
 if(/改变|推翻|条件|下一/.test(q))return {answer:r.triggers.join('\n'),citations:[]};
 if(/口径|冲突|毛利/.test(q))return {answer:r.conflicts.join('\n'),citations:['E4']};
 return {answer:'此问题暂未命中经过核验的追问规则，不能生成新事实。可将它加入研究任务，或追问现金流、扣非与主营的差别、会计口径、结论改变条件。',citations:[]};
}
