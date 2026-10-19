(() => {
  'use strict';
  const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const sum=(rows,key)=>Math.round(rows.reduce((n,row)=>n+row[key],0)*1000000)/1000000;
  function makeFiles({faculty,academicYear,semester,rows,updatedAt,isSummary=false}) {
    const period=semester ? semester+' семестр' : 'Увесь навчальний рік';
    const generated=new Intl.DateTimeFormat('uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date());
    const headers=[isSummary?'№':'Код кафедри',isSummary?'Факультет / ННІ':'Кафедра','Лекції','Практичні','Лабораторні','Екзамени','Разом'];
    const keys=['lectures','practical','laboratory','exams','total'];
    const stringCell=(ref,value,style=0)=>`<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    const numericCell=(ref,value,style=2,formula='')=>`<c r="${ref}" s="${style}">${formula?'<f>'+xml(formula)+'</f>':''}<v>${value}</v></c>`;
    const labelRow=(n,value,style)=>`<row r="${n}" ht="25" customHeight="1">${stringCell('A'+n,value,style)}</row>`;
    let sheetRows=labelRow(1,isSummary?'Варіант розрахунку - загальне навантаження Університету':'Варіант розрахунку - навантаження кафедр факультету / ННІ',4)+labelRow(2,faculty.name,5)+labelRow(3,academicYear.replace(/[–—]/g,'-')+' навчальний рік · '+period,0)+labelRow(4,'Сформовано: '+generated+' (київський час)',0);
    sheetRows+='<row r="6" ht="32" customHeight="1">'+headers.map((h,i)=>stringCell(String.fromCharCode(65+i)+'6',h,1)).join('')+'</row>';
    rows.forEach((row,i)=>{
      const n=i+7,height=Math.max(32,Math.ceil(row.name.length/57)*19);
      sheetRows+=`<row r="${n}" ht="${height}" customHeight="1">`+stringCell('A'+n,row.code,0)+stringCell('B'+n,row.name,0)+keys.map((key,j)=>numericCell(String.fromCharCode(67+j)+n,row[key],2,row.sourceSheet ? "'"+row.sourceSheet.replace(/'/g,"''")+"'!"+String.fromCharCode(67+j)+row.sourceRow : '')).join('')+'</row>';
    });
    const last=6+rows.length,totalRow=last+1;
    sheetRows+=`<row r="${totalRow}" ht="30" customHeight="1">`+stringCell('A'+totalRow,'Усього',3)+stringCell('B'+totalRow,isSummary?'По Університету':'По факультету / ННІ',3)+keys.map((key,j)=>{const col=String.fromCharCode(67+j);return numericCell(col+totalRow,sum(rows,key),3,rows.length?`SUM(${col}7:${col}${last})`:'0');}).join('')+'</row>';
    const noteRow=totalRow+2;
    const notes=[isSummary?'Підсумки факультетів та ННІ. Деталізація кафедр наведена на окремих аркушах.':'Враховано навантаження кафедр цього підрозділу на всіх ОНП, зокрема інших факультетів.','Спільні групи враховано один раз; застосовано частки кафедр. Самостійна робота та заліки не включені.'];
    if(updatedAt && !Number.isNaN(Date.parse(updatedAt)))notes.push('Дані оновлено: '+new Intl.DateTimeFormat('uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date(updatedAt))+' (київський час).');
    notes.forEach((note,i)=>{sheetRows+=`<row r="${noteRow+i}" ht="32" customHeight="1">${stringCell('A'+(noteRow+i),note)}</row>`;});
    const merges=[1,2,3,4,...notes.map((_,i)=>noteRow+i)].map(n=>`<mergeCell ref="A${n}:G${n}"/>`).join('');
    const files={
      '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Навантаження кафедр" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>',
      'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml':'<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/><color rgb="FF263E48"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="14"/><name val="Calibri"/><color rgb="FF117A65"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF12856F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7F5EF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="164" fontId="2" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
      'xl/worksheets/sheet1.xml':`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:G${noteRow+notes.length-1}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="75" customWidth="1"/><col min="3" max="7" width="16" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A6:G${Math.max(6,last)}"/><mergeCells count="${4+notes.length}">${merges}</mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`
    };
    return files;
  }
  const build=options=>zip(makeFiles(options));
  function buildUniversity({academicYear,semester,groups,updatedAt}) {
    const sheets=groups.map((group,i)=>({name:(String(i+1).padStart(2,'0')+' '+group.faculty.name.replace(/^Факультет /,'').replace(/^Навчально-науковий інститут /,'ННІ ')).replace(/[\\/*?:\[\]]/g,'-').slice(0,31),group}));
    const summaryRows=sheets.map(({name,group},i)=>({code:String(i+1),name:group.faculty.name,sourceSheet:name,sourceRow:7+group.rows.length,
      ...Object.fromEntries(['lectures','practical','laboratory','exams','total'].map(key=>[key,sum(group.rows,key)]))}));
    const files=makeFiles({faculty:{name:'Університет - усі факультети та ННІ'},academicYear,semester,rows:summaryRows,updatedAt,isSummary:true});
    for (let i=0;i<sheets.length;i++) files['xl/worksheets/sheet'+(i+2)+'.xml']=makeFiles({...sheets[i].group,academicYear,semester,updatedAt})['xl/worksheets/sheet1.xml'];
    const names=['Університет',...sheets.map(s=>s.name)],ns='http://schemas.openxmlformats.org';
    files['xl/workbook.xml']='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="'+ns+'/spreadsheetml/2006/main" xmlns:r="'+ns+'/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>'+names.map((name,i)=>'<sheet name="'+xml(name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>';
    files['xl/_rels/workbook.xml.rels']='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="'+ns+'/package/2006/relationships">'+names.map((name,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+ns+'/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rId'+(names.length+1)+'" Type="'+ns+'/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    files['[Content_Types].xml']=files['[Content_Types].xml'].replace('</Types>',names.slice(1).map((name,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+2)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>');
    return zip(files);
  }
  function zip(files){
    const encoder=new TextEncoder(),chunks=[],central=[];let offset=0;
    const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
    for(const [name,content] of Object.entries(files)){
      const n=encoder.encode(name),data=encoder.encode(content),checksum=crc(data),head=new Uint8Array(30+n.length),h=new DataView(head.buffer);
      h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint32(14,checksum,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,n.length,true);head.set(n,30);
      const c=new Uint8Array(46+n.length),v=new DataView(c.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint32(16,checksum,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,n.length,true);v.setUint32(42,offset,true);c.set(n,46);central.push(c);chunks.push(head,data);offset+=head.length+data.length;
    }
    const size=central.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
    return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  async function save(blob,name){
    if(window.showSaveFilePicker){
      const handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'Excel',accept:{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':['.xlsx']}}]});
      const stream=await handle.createWritable();await stream.write(blob);await stream.close();return;
    }
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  window.FACULTY_REPORT={build,buildUniversity,save};
})();




