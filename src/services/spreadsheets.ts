import {exportContext,REPORT_BRAND} from './reportBrand';
import {parseCsv} from './csv';

export async function readSpreadsheet(file:File):Promise<string[][]>{
 if(file.size>10*1024*1024)throw new Error('Choose a file up to 10 MB.');
 if(/\.csv$/i.test(file.name))return parseCsv((await file.text()).replace(/^\uFEFF/,''));
 if(!/\.xlsx$/i.test(file.name))throw new Error('Choose a CSV or Excel (.xlsx) file.');
 const {Workbook}=await import('exceljs');const book=new Workbook();await book.xlsx.load(await file.arrayBuffer());
 const sheet=book.worksheets[0];if(!sheet)throw new Error('The workbook has no worksheet.');
 const rows:string[][]=[];sheet.eachRow(row=>{const values:string[]=[];row.eachCell({includeEmpty:true},(cell,colNumber)=>{const value=cell.value;if(value&&typeof value==='object'&&('formula' in value||'sharedFormula' in value))throw new Error(`Row ${row.number}: replace formulas with plain values before importing.`);values[colNumber-1]=cell.text||'';});rows.push(values.map(v=>v||''));});return rows;
}
export async function downloadWorkbook(filename:string,headers:string[],rows:(string|number|null|undefined)[][],sheetName='Data'){
 const context=exportContext(filename);const {Workbook}=await import('exceljs');const book=new Workbook();book.creator='Apricty Digital Labs';book.created=new Date();if(!/template/i.test(filename))addReportCover(book,filename,context);const sheet=book.addWorksheet(sheetName.slice(0,31));sheet.pageSetup={paperSize:9,orientation:headers.length>6?'landscape':'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0};sheet.headerFooter={oddHeader:`&LMatrixTrack 2.0&R${context.from} to ${context.to}`,oddFooter:`&L${REPORT_BRAND}&RPage &P of &N`};
 sheet.addRow(headers);for(const row of rows)sheet.addRow(row.map(v=>v??''));
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF24566A'}};
 sheet.columns.forEach(col=>{col.width=25;});sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:headers.length}};
 const bytes=await book.xlsx.writeBuffer();const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export interface ExportSheet {name:string;headers:string[];rows:(string|number|boolean|null|undefined)[][];}
export async function downloadAuditWorkbook(filename:string,sheets:ExportSheet[],validate:()=>void=()=>{}) {
 const context=exportContext(filename);const {Workbook}=await import('exceljs');const book=new Workbook();book.creator='Apricty Digital Labs';book.created=new Date();addReportCover(book,filename,context);
 for(const source of sheets){
  if(source.rows.length>1048575)throw new Error(`${source.name} exceeds the Excel row limit. Narrow the dates.`);
  const sheet=book.addWorksheet(source.name.slice(0,31));sheet.pageSetup={paperSize:9,orientation:source.headers.length>6?'landscape':'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0};sheet.headerFooter={oddHeader:`&LMatrixTrack 2.0&R${context.from} to ${context.to}`,oddFooter:`&L${REPORT_BRAND}&RPage &P of &N`};sheet.addRow(source.headers);
  for(const row of source.rows)sheet.addRow(row.map(value=>value==null?'Not available':typeof value==='string'?value.slice(0,32767):value));
  sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF24566A'}};
  sheet.columns.forEach(c=>{c.width=24;});sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:source.headers.length}};
 }
 const bytes=await book.xlsx.writeBuffer();validate();const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function addReportCover(book:any,title:string,context:ReturnType<typeof exportContext>){
 const sheet=book.addWorksheet('Report overview');sheet.columns=[{width:28},{width:80}];
 for(const row of [['MATRIXTRACK 2.0',title.replace(/\.xlsx$/i,'').replace(/[-_]/g,' ')],['City',context.city],['Selected dates (IST)',`${context.from} to ${context.to}`],['Generated (IST)',context.generated],['Data basis',context.basis],['Powered by','Apricty Digital Labs']])sheet.addRow(row);
 sheet.getRow(1).height=38;sheet.getRow(1).font={bold:true,size:17,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF173E52'}};sheet.eachRow((row:any,i:number)=>{if(i>1){row.height=26;row.getCell(1).font={bold:true,color:{argb:'FF31566E'}};row.getCell(2).alignment={wrapText:true,vertical:'middle'};}});sheet.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1};sheet.headerFooter={oddFooter:`&L${REPORT_BRAND}&RPage &P of &N`};
}
