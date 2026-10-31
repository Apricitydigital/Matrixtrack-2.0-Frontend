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
 const {Workbook}=await import('exceljs');const book=new Workbook();const sheet=book.addWorksheet(sheetName.slice(0,31));
 sheet.addRow(headers);for(const row of rows)sheet.addRow(row.map(v=>v??''));
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF24566A'}};
 sheet.columns.forEach(col=>{col.width=25;col.numFmt='@';});sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:headers.length}};
 const bytes=await book.xlsx.writeBuffer();const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
