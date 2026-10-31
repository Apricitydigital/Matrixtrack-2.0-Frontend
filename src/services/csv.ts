/**
 * MatrixTrack 2.0 - CSV Parser, Generator & Formula Injection Protection
 */

// Formula injection protection: prefix characters that spreadsheet apps interpret as formulas
export function sanitizeForCsv(value: any): string {
  if (value === null || value === undefined) return '';
  let str = String(value).trim();
  // If string starts with =, +, -, @, \t, \r, escape with leading single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // If string contains comma, quotes, or newlines, quote and escape interior quotes
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(sanitizeForCsv).join(',');
  const rowLines = rows.map(row => row.map(sanitizeForCsv).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// RFC 4180 compliant CSV parser that supports quotes, embedded commas, and multiline values
export function parseCsv(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        cell += '"';
        i += 2;
        continue;
      } else {
        // Toggle quotes
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !insideQuotes) {
      row.push(cell.trim());
      cell = '';
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !insideQuotes) {
      // End of line
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n of CRLF
      }
      row.push(cell.trim());
      // Only push non-empty rows
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
      row = [];
      cell = '';
      i++;
      continue;
    }

    cell += char;
    i++;
  }

  // Push final cell/row if remaining
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
      lines.push(row);
    }
  }

  return lines;
}

export const SAMPLE_TEMPLATES = {
  attendance: {
    filename: 'attendance_upload_template.csv',
    content: `Date,Employee_Name,Role,Zone_Number,Ward_Number,Shift,Status,Check_In_Time,Check_Out_Time
2026-10-29,Ramesh Yadav,EMPLOYEE,1,1,morning,present,06:02,14:05
2026-10-29,Sunita Bai,EMPLOYEE,1,1,morning,present,05:58,14:00
2026-10-29,Vikram Singh,SUPERVISOR,1,1,morning,present,05:50,14:30
2026-10-29,Anil Kumar,EMPLOYEE,1,2,morning,late,06:45,14:00
2026-10-29,Pooja Sharma,EMPLOYEE,1,2,morning,leave,,
2026-10-29,Devendra Verma,QC,1,2,morning,present,06:00,14:00`
  },
  beats: {
    filename: 'beat_master_template.csv',
    content: `Beat_Number,Beat_Name,Zone_Number,Ward_Number,Area_Name,Length_Km,Start_Point,End_Point,Priority,Shift
B-101,Rajwada Main Road,1,1,Rajwada Central,1.8,Gopal Mandir,Sarafa Corner,high,morning
B-102,Sarafa Bazaar Lane 1,1,1,Sarafa Market,1.2,Sarafa Chowk,Khajuri Lane,high,morning
B-103,M.G. Road Commercial,1,2,Palasia West,2.1,Chhavani Square,Indraprastha Tower,medium,morning
B-104,Navlakha Residential,1,3,Navlakha North,2.4,Main Bus Stand,Ring Road Junction,low,morning`
  },
  plantLogs: {
    filename: 'plant_daily_log_template.csv',
    content: `Date,Plant_Name,Plant_Type,Incoming_Tons,Processed_Tons,Recovered_Tons,Rejected_Tons,Disposed_Tons,Operating_Hours
2026-10-29,Devguradia MRF Plant 1,mrf,420.5,395.0,85.2,45.8,264.0,18.5
2026-10-29,Central Bio-Methanation Plant,compost,180.0,175.0,32.0,12.0,131.0,20.0
2026-10-29,West Zone C&D Processing,c_and_d,150.0,140.0,110.0,15.0,15.0,16.0`
  }
};
