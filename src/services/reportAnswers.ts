/** Read saved survey shapes without treating workflow metadata as an answer. */
export function reportAnswers(raw:any):any[] {
 const p=raw.payload||{};
 const read=(source:any):any[]=>{
  if(Array.isArray(source))return source;
  if(!source||typeof source!=='object')return [];
  for(const key of ['inspectionAnswers','answers','surveyAnswers','questionnaire','responses']){
   const nested=read(source[key]);if(nested.length)return nested;
  }
  return Object.entries(source).flatMap(([key,value]:[string,any])=>{
   const item=value&&typeof value==='object'&&!Array.isArray(value)?value:{answer:value};
   if(!/^(?:q\d+|[A-Z]+_?\d+)$/i.test(key)&&!item.question&&!item.label&&!item.questionText)return [];
   return [{...item,code:item.code||key,question:item.question||item.questionText||item.label||key,answer:item.answer??item.answerValue??item.value??''}];
  });
 };
 for(const source of [raw.inspectionAnswers,raw.answers,raw.surveyAnswers,raw.questionnaire,p.answers,p.surveyAnswers,p.questionnaire,p.responses,p]){const rows=read(source);if(rows.length)return rows;}
 return [];
}
