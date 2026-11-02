/** Recognize common Hindi municipal terms without rewriting figures or inventing a date. */
export function municipalSpeech(text:string) {
  let value=text.normalize('NFKC').replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d)));
  value=value.replace(/पिछले\s+(\d+)\s+दिन(?:ों)?/g,' last $1 days ');
  const words:Record<string,string>={'कार्रवाई की गई':'action taken','कार्रवाई आवश्यक':'action required','कार्यवाही की गई':'action taken','कार्यवाही आवश्यक':'action required','पिछले सप्ताह':'last week','इस सप्ताह':'this week','पिछले महीने':'last month','इस महीने':'this month','कचरा पात्र':'litter bins','सबसे अच्छा':'best','आज':'today','निरीक्षण':'inspection','उपस्थिति':'attendance','कवरेज':'coverage','लक्ष्य':'target','लंबित':'pending','समीक्षा':'review','वार्ड':'ward','ज़ोन':'zone','जोन':'zone','नाला':'nala','शौचालय':'toilet','स्वीपिंग':'sweeping','रैंकिंग':'ranking','स्कोर':'score','कितने':'how many'};
  for(const [word,translation] of Object.entries(words))value=value.replaceAll(word,` ${translation} `);
  return value.replace(/\s+/g,' ').trim();
}
