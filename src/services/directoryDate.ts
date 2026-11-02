export function directoryDate(value?:string|null){
 if(!value||!Number.isFinite(Date.parse(value)))return 'Not recorded';
 return new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'});
}
