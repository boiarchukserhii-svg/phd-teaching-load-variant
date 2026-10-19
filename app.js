(() => {
  'use strict';
  const data = window.TEACHING_DATA || {faculties:[],departments:[],programs:[],disciplines:[]};
  const faculties = data.faculties || [], departments = data.departments || [], programs = data.programs || [], disciplines = data.disciplines || [];
  const $ = id => document.getElementById(id);
  $('academic-year').textContent = (data.academicYear || '2026-2027').replace(/[\u2013\u2014]/g,'-')+' навчальний рік';
  if (data.updatedAt && !Number.isNaN(Date.parse(data.updatedAt))) {
    $('data-updated').hidden=false;
    $('data-updated').textContent='Дані оновлено: '+new Intl.DateTimeFormat('uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'}).format(new Date(data.updatedAt))+' (київський час)';
  }
  const esc = value => String(value ?? '').replace(/[\u2013\u2014]/g,'-').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize = value => String(value || '').normalize('NFC').toLocaleLowerCase('uk-UA').replace(/[’ʼ']/g,'').trim();
  const includes = (value, query) => normalize(query).split(/\s+/).filter(Boolean).every(word => normalize(value).includes(word));
  const facultyById = new Map(faculties.map(item => [item.id,item]));
  const departmentById = new Map(departments.map(item => [item.id,item]));
  const programById = new Map(programs.map(item => [item.id,item]));
  const students = (data.students || []).filter(item=>item.academicYear === data.academicYear);
  const studentSummary = programId => {
    const records = students.filter(item=>item.programId === programId);
    if (!records.length) return '';
    const courses = [...new Set(records.map(item=>item.course))].sort((a,b)=>a-b);
    return courses.map(course=>{
      const cohort = records.filter(item=>item.course === course).sort((a,b)=>a.semester-b.semester);
      return `<p><strong>Аспіранти · ${esc(course)} курс · ${esc(data.academicYear)}</strong><br>${cohort.map(item=>`${esc(item.semester)} семестр: ${esc(item.count)}`).join(' · ')}</p>`;
    }).join('');
  };
  const disciplineFaculty = item => item.facultyId || programById.get(item.programId)?.facultyId;
  const facultyName = id => facultyById.get(id)?.name || 'Підрозділ не зазначено';
  const icons = {
    home:'<path d="m3 10 9-7 9 7v10h-6v-7H9v7H3Z"/>',
    book:'<path d="M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 2-3-3-6-3-9-2Z"/>',
    program:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v8l4-3 4 3V3M8 16h8"/>',
    layers:'<path d="m3 7 9-4 9 4-9 4ZM3 12l9 4 9-4M3 17l9 4 9-4"/>',
    building:'<path d="M3 21h18M5 21V8h14v13M3 8l9-5 9 5M9 12v2m6-2v2M10 21v-4h4v4"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
  };
  const icon = key => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key] || icons.book}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(node => {node.innerHTML = icon(node.dataset.icon);});
  let view = 'faculties';
  const returnStack = [];
  const backLabels = {faculties:'до факультетів та ННІ',departments:'до кафедр',programs:'до ОНП',disciplines:'до дисциплін'};
  const backButtons = new Map();
  const searchPanels = new Map();
  for (const name of ['program','discipline']) {
    const form=$(name+'-filters'),details=document.createElement('details');
    details.className='context-search';details.id=name+'-search-panel';details.open=true;
    const summary=document.createElement('summary');summary.textContent='Пошук і фільтри';
    form.before(details);details.append(summary,form);searchPanels.set(name,details);
  }
  for (const name of ['faculties','departments','programs','disciplines']) {
    const button = document.createElement('button');
    button.type = 'button';button.id = 'back-from-'+name;button.className = 'reset';
    button.style.margin = '18px 0 0';button.hidden = true;
    $('view-'+name).prepend(button);backButtons.set(name,button);
    button.onclick = () => {
      const previous = returnStack.pop();
      if (!previous) return;
      for (const [id,value] of previous.filters) $(id).value = value;
      setView(previous.view,false);
      window.scrollTo({top:previous.scrollTop,behavior:'instant'});
      const target = previous.target && $('view-'+previous.view).querySelector(previous.target);
      (target || $('view-'+previous.view).querySelector('h2')).focus({preventScroll:true});
    };
  }
  function rememberOrigin(target) {
    returnStack.push({view,scrollTop:window.scrollY,target,
      filters:[...$('view-'+view).querySelectorAll('.filters input,.filters select')].map(node=>[node.id,node.value])});
  }
  function updateBackButtons() {
    const previous = returnStack.at(-1);
    for (const [name,button] of backButtons) {
      button.hidden = name !== view || !previous;
      button.textContent = previous ? '← Назад '+backLabels[previous.view] : '';
    }
  }
  function setView(name, moveFocus = true) {
    if (!['disciplines','departments','programs','faculties'].includes(name)) name = 'faculties';
    view = name;
    $('home-button').classList.remove('current');
    $('home-button').setAttribute('aria-current','false');
    document.querySelectorAll('.view').forEach(section => {section.hidden = section.id !== 'view-'+view;});
    document.querySelectorAll('.bottom-nav [data-view]').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('current',active);button.setAttribute('aria-current',active?'page':'false');
    });
    for (const [name,panel] of searchPanels) panel.open = !returnStack.length;
    render();
    updateBackButtons();
    if (moveFocus) {
      const heading = $('view-'+view).querySelector('h2');
      heading.focus({preventScroll:true});
      const back = backButtons.get(view);
      (back && !back.hidden ? back : heading).scrollIntoView({block:'start',behavior:'instant'});
    }
  }
  document.querySelectorAll('[data-view]').forEach(button => {button.onclick = () => {
    returnStack.length = 0;
    setView(button.dataset.view);
  };});
  $('home-button').onclick = () => {
    returnStack.length = 0;
    setView('faculties',false);
    document.querySelectorAll('.bottom-nav [data-view]').forEach(button => {
      button.classList.remove('current');button.setAttribute('aria-current','false');
    });
    $('home-button').classList.add('current');
    $('home-button').setAttribute('aria-current','page');
    document.querySelector('.app-header h1').focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
  };
  const facultyOptions = '<option value="">Усі підрозділи</option>'+faculties.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
  $('discipline-faculty').innerHTML = facultyOptions;
  $('department-faculty').innerHTML = facultyOptions;
  $('program-faculty').innerHTML = facultyOptions;
  $('discipline-total').textContent = disciplines.length;
  $('department-total').textContent = departments.length;
  $('faculty-total').textContent = faculties.length;
  $('program-total').textContent = programs.length;
  const formatHours = value => value == null ? '-' : esc(new Intl.NumberFormat('uk-UA').format(value));
  const hoursBreakdown = hours => [['lectures','Лекції'],['practical','Практичні'],['laboratory','Лабораторні']]
    .filter(([key])=>Number(hours[key])>0).map(([key,label])=>`${label}: ${formatHours(hours[key])}`).join(' · ');
  const hoursDetails = item => {
    const hours = item.hours;
    if (!hours) return '';
    return `<div class="discipline-hours"><p><strong>Години за навчальним планом</strong></p>
      <p>Усього: <strong>${formatHours(hours.total)}</strong> год</p><div class="classroom-accent"><span>Аудиторні години</span><strong>${formatHours(hours.classroom)} год</strong></div>
      ${hoursBreakdown(hours) ? `<p>${hoursBreakdown(hours)}</p>` : ''}
      <p>Самостійна робота: ${formatHours(hours.independent)}</p>
      ${hours.assessment ? `<p>Форма контролю: ${esc(hours.assessment)}</p>` : ''}</div>`;
  };
  const sharedMemberships = data.sharedGroups || [];
  const lessonLabels = {lectures:'Лекції',practical:'Практичні',laboratory:'Лабораторні'};
  // A session represents one taught lesson type, shared or separate, for one department.
  const teachingSessions = new Map();
  const recordSessions = new Map();
  const currentGroups = sharedMemberships.filter(entry=>entry.academicYear === data.academicYear);
  const studentCount = (programId,course,semester) => {
    const row = students.find(item=>item.programId===programId && item.course===course && item.semester===semester);
    return row ? row.count : null;
  };
  // Separate cohorts may contain several teaching groups; student totals remain unchanged.
  const separateGroupCount = item => Number.isInteger(item.groupCount) && item.groupCount>0 ? item.groupCount : 1;
  function addTeachingSession(key,item,lesson,course,members) {
    if (!teachingSessions.has(key)) teachingSessions.set(key,{departmentId:item.departmentId,semester:item.semester,lesson,course,members:new Set(),rates:new Set(),amounts:new Set()});
    const session=teachingSessions.get(key);
    for (const programId of members) session.members.add(programId);
    session.rates.add((item.departmentWorkloadShare ?? 1)*(item.calculationFactor ?? 1));
    session.amounts.add(Number(item.hours[lesson]));
    session.groupCount=JSON.parse(key)[0]==='separate' ? separateGroupCount(item) : 1;
    if (!recordSessions.has(item.id)) recordSessions.set(item.id,new Set());
    recordSessions.get(item.id).add(key);
  }
  for (const item of disciplines) {
    for (const lesson of ['lectures','practical','laboratory']) {
      if (!(Number(item.hours?.[lesson])>0)) continue;
      const memberships=currentGroups.filter(entry=>entry.disciplineId===item.id && entry.lessonType===lesson);
      const groupedCourses=new Set(memberships.map(entry=>entry.course));
      for (const entry of memberships) {
        const members=currentGroups.filter(other=>other.groupCode===entry.groupCode && other.course===entry.course &&
          other.semester===entry.semester && other.departmentId===entry.departmentId && other.lessonType===lesson);
        const key=JSON.stringify(['shared',entry.groupCode,entry.course,item.semester,item.departmentId,lesson]);
        addTeachingSession(key,item,lesson,entry.course,members.map(member=>member.programId));
      }
      const courses=[...new Set(students.filter(student=>student.programId===item.programId && student.semester===item.semester).map(student=>student.course))];
      if (!courses.length && !memberships.length) addTeachingSession(JSON.stringify(['separate',item.id,lesson,null]),item,lesson,null,[item.programId]);
      for (const course of courses) {
        if (groupedCourses.has(course)) continue;
        addTeachingSession(JSON.stringify(['separate',item.id,lesson,course]),item,lesson,course,[item.programId]);
      }
    }
  }
  // Exams use each existing shared group once; otherwise one group per ONP/course.
  const examSessions = new Map(), recordExams = new Map();
  const isExam = item => ['екзамен','іспит'].includes(normalize(item.hours?.assessment));
  const ukrainianExam = item => /українськ.*мов|мов.*українськ/.test(normalize(item.name));
  for (const item of disciplines.filter(isExam)) {
    const lessons=['lectures','practical','laboratory'].filter(lesson=>Number(item.hours?.[lesson])>0);
    const signatures=lessons.map(lesson=>currentGroups.filter(entry=>entry.disciplineId===item.id && entry.lessonType===lesson)
      .map(entry=>JSON.stringify([entry.groupCode,entry.course])).sort().join('|'));
    const ambiguous=new Set(signatures).size>1;
    const memberships=currentGroups.filter(entry=>entry.disciplineId===item.id && entry.lessonType===lessons[0]);
    const courses=[...new Set(students.filter(student=>student.programId===item.programId && student.semester===item.semester).map(student=>student.course))];
    const entries=memberships.map(entry=>({key:JSON.stringify(['shared',entry.groupCode,entry.course,item.semester,item.departmentId]),course:entry.course,
      members:currentGroups.filter(other=>other.groupCode===entry.groupCode && other.course===entry.course && other.semester===entry.semester && other.departmentId===entry.departmentId && other.lessonType===entry.lessonType).map(other=>other.programId)}));
    for (const course of courses.length?courses:[null]) {
      if (!memberships.some(entry=>entry.course===course)) entries.push({key:JSON.stringify(['separate',item.id,course]),course,members:[item.programId],groupCount:separateGroupCount(item)});
    }
    for (const entry of entries) {
      if (!examSessions.has(entry.key)) examSessions.set(entry.key,{semester:item.semester,course:entry.course,members:new Set(),rates:new Set(),exceptions:new Set(),ambiguous:false});
      const session=examSessions.get(entry.key);
      session.groupCount=entry.groupCount || 1;
      entry.members.forEach(id=>session.members.add(id));session.rates.add((item.departmentWorkloadShare ?? 1)*(item.calculationFactor ?? 1));
      session.exceptions.add(ukrainianExam(item));session.ambiguous ||= ambiguous;
      if (!recordExams.has(item.id)) recordExams.set(item.id,new Set());
      recordExams.get(item.id).add(entry.key);
    }
  }
  function workloadFor(items,semester=null) {
    const keys=new Set(items.flatMap(item=>[...(recordSessions.get(item.id)||[])]));
    const totals={lectures:0,practical:0,laboratory:0,classroom:0,exams:0,total:0,incomplete:false};
    for (const key of keys) {
      const session=teachingSessions.get(key);
      if (semester!=null && session.semester!==semester) continue;
      const counts=[...session.members].map(programId=>studentCount(programId,session.course,session.semester));
      if (counts.some(count=>count==null) || session.rates.size!==1 || session.amounts.size!==1) {totals.incomplete=true;continue;}
      if (!counts.some(count=>count>0)) continue;
      totals[session.lesson]+=[...session.amounts][0]*[...session.rates][0]*session.groupCount;
    }
    totals.classroom=totals.lectures+totals.practical+totals.laboratory;
    const examKeys=new Set(items.flatMap(item=>[...(recordExams.get(item.id)||[])]));
    for (const key of examKeys) {
      const session=examSessions.get(key);
      if (semester!=null && session.semester!==semester) continue;
      const counts=[...session.members].map(id=>studentCount(id,session.course,session.semester));
      if (counts.some(count=>count==null) || session.rates.size!==1 || session.exceptions.size!==1 || session.ambiguous) {totals.incomplete=true;continue;}
      const count=counts.reduce((sum,value)=>sum+value,0);
      if (count<=0) continue;
      totals.exams+=(([...session.exceptions][0]?0:2*session.groupCount)+0.5*count)*[...session.rates][0];
    }
    totals.total=totals.classroom+totals.exams;
    return totals;
  }
  const workloadLine = totals => totals.incomplete ? '<p>Для розрахунку потрібно уточнити кількість аспірантів, години або склад спільних груп.</p>' :
    `<p>${hoursBreakdown(totals) ? hoursBreakdown(totals)+'<br>' : ''}Аудиторні: ${formatHours(totals.classroom)} год${totals.exams>0 ? '<br>Екзамени: '+formatHours(totals.exams)+' год' : ''}<br><strong>Разом: ${formatHours(totals.total)} год</strong></p>`;
  const disciplineWorkload = items => {
    const total=workloadFor(items);
    return `<div class="discipline-workload" data-workload-total="${total.incomplete?'':total.total}"><p><strong>Навантаження кафедри</strong></p>${workloadLine(total)}</div>`;
  };
  const departmentWorkload = departmentId => {
    const items=disciplines.filter(item=>item.departmentId===departmentId);
    const year=workloadFor(items),first=workloadFor(items,1),second=workloadFor(items,2);
    return `<div class="department-workload" data-department-total="${year.incomplete?'':year.total}" data-semester-one="${first.incomplete?'':first.total}" data-semester-two="${second.incomplete?'':second.total}">
      <p><strong>Навчальне навантаження · ${esc(data.academicYear || '')}</strong></p>
      <p><strong>1 семестр</strong></p>${workloadLine(first)}<p><strong>2 семестр</strong></p>${workloadLine(second)}
      <p><strong>За рік: ${year.incomplete?'потребує уточнення':formatHours(year.total)+' год'}</strong></p></div>`;
  };
  function scopeWorkload(items,scope) {
    const first=workloadFor(items,1),second=workloadFor(items,2),year=workloadFor(items);
    return `<div class="scope-workload" data-workload-scope="${esc(scope)}" data-year-total="${year.incomplete?'':year.total}" data-first-total="${first.incomplete?'':first.total}" data-second-total="${second.incomplete?'':second.total}">
      <p><strong>Навчальне навантаження · ${esc(data.academicYear || '')}</strong></p>
      <p><strong>1 семестр</strong></p>${workloadLine(first)}
      <p><strong>2 семестр</strong></p>${workloadLine(second)}
      <p><strong>За рік: ${year.incomplete?'потребує уточнення':formatHours(year.total)+' год'}</strong></p>
      <p>За рік - ${year.incomplete?'потребує уточнення':hoursBreakdown(year) || 'немає аудиторного навантаження'}.</p></div>`;
  }
  const facultyWorkload = facultyId => scopeWorkload(disciplines.filter(item=>departmentById.get(item.departmentId)?.facultyId===facultyId),facultyId);
  const universityPanel=document.createElement('section');universityPanel.className='panel';universityPanel.id='university-workload-summary';
  universityPanel.innerHTML=compactScopeSummary(disciplines,'Загальне навантаження Університету','Навчальне навантаження','university');
  universityPanel.insertAdjacentHTML('beforeend','<button type="button" class="open-records" data-faculty-report="university">Завантажити звіт Університету</button>');
  $('view-faculties').prepend(universityPanel);
  const facultyPanel=document.createElement('section');facultyPanel.className='panel';facultyPanel.id='faculty-workload-summary';facultyPanel.hidden=true;
  $('program-filters').before(facultyPanel);
  function compactScopeSummary(items,title,label,scope) {
    const first=workloadFor(items,1),second=workloadFor(items,2),year=workloadFor(items);
    const amount = total => total.incomplete ? 'потребує уточнення' : formatHours(total.total)+' год';
    return `<div class="filter-scope-summary" data-summary-scope="${esc(scope)}" data-summary-total="${year.incomplete?'':year.total}" data-classroom-total="${year.classroom}" data-exam-total="${year.exams}">
      <h3>${esc(title)}</h3><p class="filter-summary-label">${esc(label)} · ${esc(data.academicYear || '')}</p>
      <p class="semester-summary"><span>1 семестр - <strong>${amount(first)}</strong></span><span>2 семестр - <strong>${amount(second)}</strong></span></p>
      <p>Аудиторні - ${formatHours(year.classroom)} год${year.exams>0 ? ' · Екзамени - '+formatHours(year.exams)+' год' : ''}</p><p class="filter-summary-year"><strong>За рік - ${amount(year)}</strong></p></div>`;
  }
  function renderFilterSummary() {
    const departmentId=$('discipline-department').value,facultyId=$('discipline-faculty').value,programId=$('discipline-program').value;
    workloadPanel.hidden=!departmentId && !facultyId;
    if (departmentId) {
      const items=disciplines.filter(item=>item.departmentId===departmentId);
      workloadPanel.innerHTML=compactScopeSummary(items,departmentLabel({departmentId}),'Навантаження кафедри','department:'+departmentId);
    } else if (facultyId) {
      const ownedDepartments=departments.filter(item=>item.facultyId===facultyId).sort((a,b)=>alphabet.compare(a.name,b.name));
      const items=disciplines.filter(item=>departmentById.get(item.departmentId)?.facultyId===facultyId);
      const rows=ownedDepartments.map(department=>{
        const total=workloadFor(disciplines.filter(item=>item.departmentId===department.id));
        return `<li><span>${esc(department.name)}</span><strong>${total.incomplete?'потребує уточнення':formatHours(total.total)+' год'}</strong></li>`;
      }).join('');
      workloadPanel.innerHTML=compactScopeSummary(items,facultyName(facultyId),'Навантаження кафедр підрозділу','faculty:'+facultyId)+
        `<details class="faculty-department-details"><summary>Кафедри та їхнє навантаження</summary>${rows?`<ul>${rows}</ul>`:'<p>Кафедри ще не додано.</p>'}</details>`;
    } else workloadPanel.innerHTML='';
    if (programId && !workloadPanel.hidden) {
      workloadPanel.innerHTML='<details class="context-load"><summary>Навантаження кафедр факультету</summary>'+workloadPanel.innerHTML+'</details>';
      $('discipline-list').after(workloadPanel);
    } else searchPanels.get('discipline').after(workloadPanel);
    scopeCaption.hidden=!!programId || (!departmentId && !facultyId);
    scopeCaption.textContent=programId ? 'Дисципліни ОНП «'+(programById.get(programId)?.name || '')+'»' :
      departmentId ? 'Дисципліни кафедри' : facultyById.get(facultyId)?.type==='institute' ? 'Дисципліни ОНП інституту' : 'Дисципліни ОНП факультету';
  }
  const workloadPanel=document.createElement('section');workloadPanel.className='panel';workloadPanel.id='department-workload-summary';workloadPanel.hidden=true;
  searchPanels.get('discipline').after(workloadPanel);
  const scopeCaption=document.createElement('h3');scopeCaption.id='discipline-scope-caption';scopeCaption.hidden=true;workloadPanel.after(scopeCaption);

  const groupWord = count => {
    const lastTwo=count%100,last=count%10;
    if (lastTwo>=11 && lastTwo<=14) return 'груп';
    return last===1 ? 'група' : last>=2 && last<=4 ? 'групи' : 'груп';
  };
  function groupCountsFor(items) {
    const keys=new Set(items.flatMap(item=>[...(recordSessions.get(item.id)||[])]));
    const counts={lectures:0,practical:0,laboratory:0,incomplete:false};
    for (const key of keys) {
      const session=teachingSessions.get(key);
      const values=[...session.members].map(programId=>studentCount(programId,session.course,session.semester));
      if (values.some(count=>count==null)) {counts.incomplete=true;continue;}
      if (values.some(count=>count>0)) counts[session.lesson]+=session.groupCount;
    }
    return counts;
  }
  function groupCountDetails(items) {
    const counts=groupCountsFor(items);
    if (counts.incomplete) return '<p>Для підрахунку груп потрібно уточнити кількість аспірантів.</p>';
    return `<div class="lesson-group-counts">${['lectures','practical','laboratory'].filter(lesson=>counts[lesson]>0 && items.some(item=>Number(item.hours?.[lesson])>0)).map(lesson=>
      `<p data-lesson="${lesson}" data-group-count="${counts[lesson]}"><strong>${esc(lessonLabels[lesson])} - ${counts[lesson]} ${groupWord(counts[lesson])}</strong></p>`).join('')}</div>`;
  }
  function compactWorkload(items) {
    const counts=groupCountsFor(items),total=workloadFor(items);
    if (counts.incomplete || total.incomplete) return workloadLine({...total,incomplete:true});
    const lines=['lectures','practical','laboratory'].filter(lesson=>counts[lesson]>0 && items.some(item=>Number(item.hours?.[lesson])>0)).map(lesson=>
      `<p data-lesson="${lesson}" data-group-count="${counts[lesson]}">${esc(lessonLabels[lesson])} - <strong>${counts[lesson]} ${groupWord(counts[lesson])} · ${formatHours(total[lesson])} год</strong></p>`).join('');
    return `<div class="compact-workload" data-workload-total="${total.total}">${lines}${total.exams>0 ? `<p>Екзамени - <strong>${formatHours(total.exams)} год</strong></p>` : ''}<p class="compact-workload-total"><strong>Навантаження кафедри - ${formatHours(total.total)} год</strong></p></div>`;
  }
  const sharedDetails = item => {
    const factorNote=item.calculationFactor===.5 ? '<p class="variant-factor"><strong>Варіант розрахунку: 50%</strong><br>Аудиторні: '+formatHours(workloadFor([item]).classroom)+' год · Разом з екзаменом: '+formatHours(workloadFor([item]).total)+' год</p>' : '';
    const share = item.departmentWorkloadShare == null ? '' : `<p><strong>Частка цієї кафедри у навантаженні: ${esc(item.departmentWorkloadShare*100)}%</strong></p>`;
    return `<div class="shared-groups">${groupCountDetails([item])}${workloadFor([item]).incomplete ? '<p>Екзаменаційне навантаження потребує уточнення.</p>' : workloadFor([item]).exams>0 ? `<p><strong>Екзамени - ${formatHours(workloadFor([item]).exams)} год</strong></p>` : ''}${share}${factorNote}</div>`;
  };
  const departmentLabel = item => departmentById.get(item.departmentId)?.name ||
    (item.departmentCode ? 'Код кафедри: '+item.departmentCode : 'Кафедру не зазначено');
  const semesters = [...new Set(disciplines.map(item=>item.semester).filter(value=>value != null))].sort((a,b)=>a-b);
  $('discipline-semester').innerHTML = '<option value="">Усі семестри</option>'+semesters.map(value=>`<option value="${esc(value)}">${esc(value)} семестр</option>`).join('');
  const types = [...new Set(disciplines.map(item=>item.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'uk'));
  $('discipline-type').innerHTML = '<option value="">Усі типи</option>'+types.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
  function empty(title, message, symbol = 'book') {
    return `<div class="empty"><span>${icon(symbol)}</span><h3>${esc(title)}</h3><p>${esc(message)}</p></div>`;
  }
  function render() {
    if (view === 'disciplines') renderDisciplines();
    if (view === 'departments') renderDepartments();
    if (view === 'faculties') renderFaculties();
    if (view === 'programs') renderPrograms();
  }
  const typeOrder = value => {
    const normalized = normalize(value);
    if (normalized.startsWith('обов')) return 0;
    if (normalized.startsWith('фах')) return 1;
    if (normalized.startsWith('вибір')) return 2;
    return 3;
  };
  const typeHeading = value => ['Обов’язкові дисципліни','Фахові дисципліни','Вибіркові дисципліни'][typeOrder(value)] || value || 'Тип не зазначено';
  const alphabet = new Intl.Collator('uk', {sensitivity:'base',numeric:true});
  const compareDisciplines = (a,b) => (Number(a.semester) || Infinity)-(Number(b.semester) || Infinity) ||
    typeOrder(a.type)-typeOrder(b.type) || alphabet.compare(a.type || '',b.type || '') ||
    alphabet.compare(a.name,b.name) || alphabet.compare(programById.get(a.programId)?.name || '',programById.get(b.programId)?.name || '') ||
    alphabet.compare(departmentLabel(a),departmentLabel(b));
  const disciplineGroupKey = item => JSON.stringify([item.departmentId,item.semester,normalize(item.name).replace(/\s+/g,' ')]);
  const programmeNames = items => [...new Set(items.map(item=>programById.get(item.programId)?.name || 'Не зазначено'))].sort(alphabet.compare);
  function groupedDisciplineDetails(items) {
    const names = programmeNames(items);
    const programmes = `<div class="program-accent"><span class="program-accent-label">Освітньо-наукові програми (${names.length})</span>${names.map(name=>`<strong>${esc(name)}</strong>`).join('')}</div>`;
    const plans = new Map();
    for (const item of items) {
      const key = JSON.stringify(item.hours || null);
      if (!plans.has(key)) plans.set(key,[]);
      plans.get(key).push(item);
    }
    const planGroups=[...plans.values()].sort((a,b)=>b.length-a.length);
    const hours = planGroups.map((plan,index)=>
      (plans.size>1 ? `<p><strong>${index===0 ? 'Основний варіант навчального плану ('+programmeNames(plan).length+' ОНП)' : 'Інший варіант: '+programmeNames(plan).map(esc).join('; ')}</strong></p>` : '')+hoursDetails(plan[0])).join('');
    const teaching = groupCountDetails(items);
    const shares = [...new Set(items.map(item=>item.departmentWorkloadShare).filter(value=>value!=null))];
    const share = shares.length === 1 ? `<p><strong>Частка цієї кафедри у навантаженні: ${esc(shares[0]*100)}%</strong></p>` : '';
    const types = [...new Set(items.map(item=>item.type))];
    const typeGroups=types.map(type=>({type,items:items.filter(item=>item.type===type)})).sort((a,b)=>b.items.length-a.items.length);
    const typeDetails = types.length>1 ? typeGroups.map((group,index)=>index===0 ?
      `<p>Тип для більшості ОНП: <strong>${esc(group.type)}</strong></p>` :
      `<p><strong>${esc(group.type)}:</strong> ${programmeNames(group.items).map(esc).join('; ')}</p>`).join('') : '';
    return compactWorkload(items)+share+`<details class="discipline-details"><summary>Деталі</summary><div class="discipline-details-content">${programmes}${typeDetails}${hours}</div></details>`;
  }
  function renderDisciplines() {
    const selectedProgram = $('discipline-program').value;
    const availablePrograms = programs.filter(item=>!$('discipline-faculty').value || item.facultyId === $('discipline-faculty').value);
    $('discipline-program').innerHTML = '<option value="">Усі програми</option>'+availablePrograms.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('');
    if (availablePrograms.some(item=>item.id === selectedProgram)) $('discipline-program').value = selectedProgram;
    const selected = $('discipline-department').value;
    const scopedDepartmentIds = new Set(disciplines.filter(item=>
      (!$('discipline-faculty').value || disciplineFaculty(item) === $('discipline-faculty').value) &&
      (!$('discipline-program').value || item.programId === $('discipline-program').value)).map(item=>item.departmentId));
    const available = departments.filter(item=>(!$('discipline-faculty').value && !$('discipline-program').value) || scopedDepartmentIds.has(item.id));
    $('discipline-department').innerHTML = '<option value="">Усі кафедри</option>'+available.map(item=>`<option value="${esc(item.id)}">${esc(item.code?item.code+' · ':'')}${esc(item.name)}</option>`).join('');
    if (available.some(item=>item.id===selected)) $('discipline-department').value = selected;
    const entries = disciplines.filter(item=>includes([item.name,item.departmentCode,departmentById.get(item.departmentId)?.code,departmentById.get(item.departmentId)?.name,facultyName(disciplineFaculty(item)),programById.get(item.programId)?.name].join(' '),$('discipline-query').value) &&
      (!$('discipline-faculty').value || disciplineFaculty(item) === $('discipline-faculty').value) &&
      (!$('discipline-program').value || item.programId === $('discipline-program').value) &&
      (!$('discipline-department').value || item.departmentId === $('discipline-department').value) &&
      (!$('discipline-semester').value || String(item.semester) === $('discipline-semester').value) &&
      (!$('discipline-type').value || item.type === $('discipline-type').value)).sort(compareDisciplines);
    const grouped = !!$('discipline-department').value && !$('discipline-program').value;
    $('disciplines-title').textContent=$('discipline-program').value ? 'Дисципліни ОНП «'+(programById.get($('discipline-program').value)?.name || '')+'»' : 'Дисципліни';
    renderFilterSummary();

    const buckets = new Map();
    if (grouped) for (const item of entries) {
      const key = disciplineGroupKey(item);
      if (!buckets.has(key)) buckets.set(key,[]);
      buckets.get(key).push(item);
    }
    const shown = grouped ? [...buckets.values()].map(members=>({...members[0],members})).sort(compareDisciplines) : entries;
    $('discipline-count').textContent = (grouped ? 'Дисциплін: ' : 'Записів: ')+shown.length;
    $('discipline-list').innerHTML = shown.length ? shown.map((item,index)=>{
      const previous = shown[index-1];
      const newSemester = !previous || previous.semester !== item.semester;
      const newType = newSemester || previous.type !== item.type;
      const heading = (newSemester ? `<h3 class="semester-heading">${item.semester?esc(item.semester)+' семестр':'Семестр не зазначено'}</h3>` : '') +
        (newType ? `<h4 class="type-heading">${esc(typeHeading(item.type))}</h4>` : '');
      return heading+`<article class="card"><div class="discipline-tags"><span class="pill">${item.semester?esc(item.semester)+' семестр':'Семестр не зазначено'}</span>${grouped ? `<span class="pill discipline-type">${programmeNames(item.members).length} ОНП</span>` : item.type?`<span class="pill discipline-type">${esc(item.type)}</span>`:''}</div><h3>${esc(item.name)}</h3>${grouped ? '' : `<p>${esc(facultyName(disciplineFaculty(item)))}</p>`}${grouped ? groupedDisciplineDetails(item.members) : `<div class="program-accent"><span class="program-accent-label">Освітньо-наукова програма</span><strong>${esc(programById.get(item.programId)?.name || 'Не зазначено')}</strong></div><p>${esc(departmentLabel(item))}</p>${hoursDetails(item)}${sharedDetails(item)}`}</article>`;}).join('') :
      disciplines.length ? empty('Нічого не знайдено','Спробуйте змінити пошук або скинути фільтри.') :
        empty('Дисципліни ще не додано',$('discipline-faculty').value?facultyName($('discipline-faculty').value):'Тут відображатимуться дисципліни освітньо-наукових програм.');
  }
  function renderDepartments() {
    const entries = departments.filter(item=>includes([item.name,item.code].join(' '),$('department-query').value) && (!$('department-faculty').value || item.facultyId === $('department-faculty').value));
    $('department-count').textContent = 'Кафедр: '+entries.length;
    $('department-list').innerHTML = entries.length ? entries.map(item=>`<article class="card"><span class="pill">${esc(item.code || 'Кафедра')}</span><h3>${esc(item.name)}</h3><p>${esc(facultyName(item.facultyId))}</p>${departmentWorkload(item.id)}<button type="button" class="open-records" data-department="${esc(item.id)}">Переглянути дисципліни →</button></article>`).join('') :
      departments.length ? empty('Нічого не знайдено','Спробуйте змінити пошук або скинути фільтри.','layers') : empty('Кафедри ще не додано','Тут відображатиметься перелік кафедр та їхніх дисциплін.','layers');
  }
  function renderPrograms() {
    const selectedFaculty=$('program-faculty').value;
    const fromFaculty=returnStack.at(-1)?.view==='faculties';
    $('programs-title').textContent=selectedFaculty ? 'ОНП - '+facultyName(selectedFaculty) : 'Освітньо-наукові програми';
    facultyPanel.hidden=!selectedFaculty;
    facultyPanel.innerHTML=selectedFaculty ? `<h3>${esc(facultyName(selectedFaculty))}</h3><p>За кафедрами підрозділу</p>`+facultyWorkload(selectedFaculty) : '';

    if (selectedFaculty && fromFaculty) {
      facultyPanel.innerHTML='<details class="context-load"><summary>Навантаження кафедр факультету</summary>'+facultyPanel.innerHTML+'</details>';
      $('program-list').after(facultyPanel);
    } else searchPanels.get('program').before(facultyPanel);
    const entries = programs.filter(item=>includes([item.name,item.specialty,item.code].join(' '),$('program-query').value) &&
      (!$('program-faculty').value || item.facultyId === $('program-faculty').value));
    $('program-count').textContent = 'Програм: '+entries.length;
    $('program-list').innerHTML = entries.length ? entries.map(item=>`<article class="card"><span class="pill">Освітньо-наукова програма</span><h3>${esc(item.name)}</h3><p>${esc(facultyName(item.facultyId))}</p>${item.specialty?`<p>Спеціальність: ${esc(item.specialty)}</p>`:''}${studentSummary(item.id)}<button type="button" class="open-records" data-program="${esc(item.id)}">Переглянути дисципліни →</button></article>`).join('') :
      programs.length ? empty('Нічого не знайдено','Спробуйте змінити пошук або скинути фільтри.','program') :
      empty('Освітньо-наукові програми ще не додано',$('program-faculty').value?facultyName($('program-faculty').value):'Тут відображатимуться програми факультетів та навчально-наукових інститутів.','program');
  }
  function renderFaculties() {
    const entries = faculties.filter(item=>includes(item.name,$('faculty-query').value) && (!$('faculty-type').value || item.type === $('faculty-type').value));
    $('faculty-count').textContent = 'Підрозділів: '+entries.length;
    $('faculty-list').innerHTML = entries.length ? entries.map(item=>`<article class="card"><span class="pill ${item.type==='institute'?'institute':''}">${item.type==='institute'?'Навчально-науковий інститут':'Факультет'}</span><h3>${esc(item.name)}</h3><p>За кафедрами підрозділу</p>${facultyWorkload(item.id)}<button type="button" class="open-records" data-faculty="${esc(item.id)}">Переглянути ОНП →</button> <button type="button" class="open-records" data-faculty-report="${esc(item.id)}">Завантажити звіт Excel</button></article>`).join('') : empty('Нічого не знайдено','Спробуйте іншу назву або скиньте фільтри.','building');
  }
  const reportDialog=document.createElement('dialog');reportDialog.id='faculty-report-dialog';
  reportDialog.style.width='min(540px, calc(100vw - 32px))';
  reportDialog.innerHTML='<h2>Звіт про навантаження кафедр</h2><p id="report-faculty-name"></p><label for="report-period">Період</label><select id="report-period" style="display:block;width:100%;margin:8px 0 16px;padding:12px;font-size:16px"><option value="">Увесь навчальний рік</option><option value="1">1 семестр</option><option value="2">2 семестр</option></select><p class="muted" id="report-description">Один рядок - одна кафедра. Враховано її викладання на всіх ОНП, зокрема інших факультетів.</p><p id="report-status" role="status" aria-live="polite"></p><button type="button" class="primary" id="report-download">Завантажити Excel</button> <button type="button" class="reset" id="report-close">Закрити</button>';
  document.body.append(reportDialog);
  let reportFacultyId='';
  $('report-close').onclick=()=>reportDialog.close();
  $('report-download').onclick=async()=>{
    const isUniversity=reportFacultyId==='university';
    const faculty=isUniversity?{id:'university',name:'Університет - усі факультети та ННІ'}:facultyById.get(reportFacultyId);if(!faculty)return;
    const semester=$('report-period').value ? Number($('report-period').value) : null;
    const rows=departments.filter(item=>isUniversity || item.facultyId===faculty.id).sort((a,b)=>a.name.localeCompare(b.name,'uk')).map(item=>({code:item.code||item.id,name:item.name,facultyId:item.facultyId,...workloadFor(disciplines.filter(d=>d.departmentId===item.id),semester)}));
    if(rows.some(row=>row.incomplete)){$('report-status').textContent='Потрібно уточнити дані навантаження кафедр. Файл не сформовано.';return;}
    if(!window.FACULTY_REPORT){$('report-status').textContent='Не вдалося завантажити модуль звіту. Оновіть сторінку з інтернетом.';return;}
    $('report-download').disabled=true;
    try{
      const options={faculty,academicYear:data.academicYear||'',semester,rows,updatedAt:data.updatedAt};
      const blob=isUniversity ? window.FACULTY_REPORT.buildUniversity({...options,groups:faculties.map(faculty=>({faculty,rows:rows.filter(row=>row.facultyId===faculty.id)}))}) : window.FACULTY_REPORT.build(options);
      const name='Варіант_навантаження_'+faculty.id+'_'+String(data.academicYear||'').replace(/[–—]/g,'-')+'_'+(semester?'семестр-'+semester:'за-рік')+'.xlsx';
      await window.FACULTY_REPORT.save(blob,name);reportDialog.close();
    }catch(error){$('report-status').textContent=error.name==='AbortError'?'Збереження скасовано.': 'Не вдалося зберегти звіт. Спробуйте ще раз.';}
    finally{$('report-download').disabled=false;}
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-faculty-report]');if(!button)return;
    reportFacultyId=button.dataset.facultyReport;$('report-faculty-name').textContent=reportFacultyId==='university'?'Університет - усі факультети та ННІ':facultyName(reportFacultyId);
    $('report-description').textContent=reportFacultyId==='university'?'Підсумок Університету за факультетами та ННІ, а також окремий аркуш із кафедрами кожного підрозділу.':'Один рядок - одна кафедра. Враховано її викладання на всіх ОНП, зокрема інших факультетів.';
    $('report-period').value='';$('report-status').textContent='';reportDialog.showModal();
  });
  document.addEventListener('click', event => {
    const faculty = event.target.closest('[data-faculty]'),department = event.target.closest('[data-department]'),program = event.target.closest('[data-program]');
    if (faculty) {
      rememberOrigin('[data-faculty="'+faculty.dataset.faculty+'"]');
      $('program-query').value='';$('program-faculty').value=faculty.dataset.faculty;setView('programs');
    }
    if (program) {
      rememberOrigin('[data-program="'+program.dataset.program+'"]');
      $('discipline-query').value='';$('discipline-faculty').value=programById.get(program.dataset.program)?.facultyId || '';
      $('discipline-program').value='';$('discipline-department').value='';$('discipline-semester').value='';$('discipline-type').value='';
      setView('disciplines');$('discipline-program').value=program.dataset.program;renderDisciplines();
    }
    if (department) {
      rememberOrigin('[data-department="'+department.dataset.department+'"]');
      $('discipline-query').value='';$('discipline-program').value='';$('discipline-semester').value='';$('discipline-type').value='';$('discipline-faculty').value='';$('discipline-department').value='';setView('disciplines');$('discipline-department').value=department.dataset.department;renderDisciplines();
    }
  });
  document.querySelectorAll('.filters').forEach(form => {
    form.addEventListener('submit',event=>event.preventDefault());
    form.addEventListener('input',event=>{if(event.target.tagName === 'INPUT') render();});
    form.addEventListener('change',event=>{if(event.target.tagName === 'SELECT') render();});
    form.addEventListener('reset',()=>setTimeout(render,0));
  });
  let installPrompt = null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
  $('install-app').onclick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;
    } else $('install-help').showModal();
  };
  const hideInstall = () => {$('install-app').hidden=true;};
  window.addEventListener('appinstalled',hideInstall);
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) hideInstall();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    const controlled = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if (controlled && !reloading) {reloading=true;location.reload();}
    });
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{}));
  }
  setView('faculties',false);
})();






























