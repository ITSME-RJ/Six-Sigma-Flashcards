(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DAY=86400000, KEY='sixSigmaV2', OLD_KEY='sixSigmaProgress';
const now=()=>Date.now(), todayKey=(d=new Date())=>d.toISOString().slice(0,10);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
window.CARDS=window.CARDS||[];
CARDS.forEach((c,i)=>{c.id=i+1;c.t=clean(c.t);c.d=clean(c.d)});
let state=loadState(), currentView='home', filteredCards=[], session=[], sessionIndex=0, sessionStarted=0;
let quizCards=[],quizIndex=0,quizCorrect=0,quizAnswered=false,quizIncorrect=[];
let touchStartX=0,touchStartY=0,touchDeltaX=0,touchDeltaY=0,wasScrolling=false;

function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function defaultState(){return {version:3,cards:{},activity:{},dailyGoal:20,quiz:{correct:0,total:0,history:[]},reviews:0,bestStreak:0,theme:'system',lastSession:null}}
function loadState(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');return {...defaultState(),...raw,quiz:{...defaultState().quiz,...(raw.quiz||{})}}}catch{return defaultState()}}
function save(){state.version=3;localStorage.setItem(KEY,JSON.stringify(state))}
function cardState(id){
 if(!state.cards[id]) state.cards[id]={ease:2.5,interval:0,reps:0,lapses:0,due:0,last:0,favorite:false,status:'new',correct:0,wrong:0};
 const s=state.cards[id]; if(s.correct==null)s.correct=0;if(s.wrong==null)s.wrong=0;if(s.ease==null)s.ease=2.5;return s;
}
function migrate(){
 if(!state.migrated){try{const old=JSON.parse(localStorage.getItem(OLD_KEY)||'{}');Object.entries(old).forEach(([id,v])=>{const s=cardState(id);if(v.level==='known'){s.status='learning';s.reps=Math.max(s.reps,1);s.interval=Math.max(s.interval,1);s.due=now()}if(v.level==='learning'){s.status='learning';s.due=now()}})}catch{}state.migrated=true}
 state.version=3;save();
}
migrate();

function isDue(c){const s=cardState(c.id);return s.status==='new'||s.due<=now()}
function mastered(c){const s=cardState(c.id);return s.reps>=4&&s.interval>=14}
function weakness(c){const s=cardState(c.id);return s.lapses*3+s.wrong*2-Math.min(s.reps,5)}
function isWeak(c){const s=cardState(c.id);return s.lapses>0||s.wrong>s.correct||((s.status==='learning')&&s.reps<3)}
function statusOf(c){return mastered(c)?'mastered':cardState(c.id).status}
function masteryPct(cards=CARDS){if(!cards.length)return 0;return Math.round(cards.reduce((sum,c)=>{const s=cardState(c.id);const score=mastered(c)?1:Math.min(.85,(s.reps*.14)+(Math.min(s.interval,14)/70));return sum+score},0)/cards.length*100)}
function readiness(){const m=masteryPct(),acc=state.quiz.total?state.quiz.correct/state.quiz.total*100:0,coverage=CARDS.filter(c=>cardState(c.id).reps>0).length/CARDS.length*100;return Math.round(clamp(m*.55+acc*.3+coverage*.15,0,100))}
function plainEnglish(c){
 const term=clean(c.t),definition=clean(c.d);
 if(!definition)return `${term} is a Group ${c.g} concept. Focus on what it does, why it matters, and when it would be used.`;
 let text=definition
  .replace(new RegExp(`^${escapeRegExp(term)}\\s*(is|means|refers to|can be defined as)?\\s*[:,-]?\\s*`,'i'),'')
  .replace(/\bcan be defined as\b|\bis defined as\b|\brefers to\b/gi,'means')
  .replace(/\bin order to\b/gi,'to')
  .replace(/\butilize[sd]?\b/gi,'use')
  .replace(/\bapproximately\b/gi,'about')
  .replace(/\bhowever\b/gi,'but')
  .replace(/\btherefore\b/gi,'so')
  .replace(/\borganizations?\b/gi,'teams')
  .replace(/\bmethodologies\b/gi,'methods')
  .replace(/\s+/g,' ')
  .trim();
 const sentences=text.match(/[^.!?]+[.!?]?/g)||[text];
 let core=sentences.slice(0,2).join(' ').trim();
 if(core.length>250)core=core.slice(0,247).replace(/\s+\S*$/,'')+'…';
 const lead=plainLead(term,definition);
 return `${lead} ${core.charAt(0).toLowerCase()+core.slice(1)}`.replace(/\s+/g,' ').trim();
}
function plainLead(term,definition){
 const t=term.toLowerCase(),d=definition.toLowerCase();
 if(/culture/.test(t))return 'In simple terms, culture is how people in a team normally think, behave, and make decisions.';
 if(/value/.test(t)&&!/stream/.test(t))return 'In simple terms, value is what the customer believes is worth paying for or receiving.';
 if(/voice of the customer|voc/.test(t+d))return 'This means listening to customers and translating their needs into clear requirements.';
 if(/continuous improvement|kaizen/.test(t+d))return 'This is the habit of making processes better through repeated, practical changes.';
 if(/process/.test(t))return `${term} describes how work moves from an input to a result.`;
 if(/quality/.test(t))return `${term} is about consistently meeting the customer’s requirements.`;
 if(/variation|variance|standard deviation/.test(t+d))return `${term} explains how much results differ from one another.`;
 if(/defect|error|failure/.test(t+d))return `${term} relates to an output that does not meet a requirement.`;
 if(/customer/.test(t+d))return `${term} focuses on understanding and meeting customer needs.`;
 if(/measure|metric|data/.test(t+d))return `${term} helps turn process performance into information that can be evaluated.`;
 return `${term} means the main idea behind this concept is straightforward:`;
}
function realWorldExample(c){
 const term=clean(c.t),text=`${term} ${clean(c.d)}`.toLowerCase();
 if(/culture/.test(text))return 'Example: A company says quality matters, but employees are rewarded only for speed. Its real culture encourages rushing, so leaders change the incentives and daily habits.';
 if(/\bvalue\b/.test(text)&&!/value stream/.test(text))return 'Example: A customer may value a reliable next-day delivery more than extra packaging. The process should prioritize the feature the customer actually cares about.';
 if(/voice of the customer|\bvoc\b/.test(text))return 'Example: A clinic surveys patients and learns that appointment delays matter more than lobby décor. The team converts that feedback into a target wait time.';
 if(/continuous improvement|kaizen/.test(text))return 'Example: A purchasing team reviews one recurring delay each week and makes a small change, such as simplifying an approval step or clarifying a form.';
 if(/dmaic/.test(text))return 'Example: A team defines late purchase orders, measures cycle time, analyzes approval bottlenecks, improves routing, and controls the new process with a dashboard.';
 if(/sipoc/.test(text))return 'Example: Before improving supplier onboarding, the team maps suppliers, required inputs, the onboarding steps, outputs, and the internal customers receiving the result.';
 if(/pareto/.test(text))return 'Example: An analysis shows that three causes create 80% of invoice exceptions, so the team fixes those causes before addressing the smaller ones.';
 if(/fishbone|cause.?and.?effect|ishikawa/.test(text))return 'Example: A team groups possible causes of late deliveries under people, process, technology, materials, measurement, and environment.';
 if(/control chart/.test(text))return 'Example: A lab tracks daily turnaround time on a control chart to separate normal fluctuation from a special event that needs investigation.';
 if(/histogram/.test(text))return 'Example: A histogram of processing times shows whether most requests cluster around the target or spread widely across slow and fast results.';
 if(/standard deviation|variation|variance/.test(text))return 'Example: Two teams may average five days, but the team with results between four and six days is more consistent than one ranging from one to twelve days.';
 if(/defect|dpmo|yield|first pass/.test(text))return 'Example: An invoice coded to the wrong department is counted as a defect because it fails the process requirement and creates rework.';
 if(/root cause|five whys|5 whys/.test(text))return 'Example: Instead of stopping at “the order was late,” the team repeatedly asks why until it finds the underlying approval or data problem.';
 if(/process map|flowchart/.test(text))return 'Example: A team draws every step from request submission to purchase-order release and discovers two duplicate reviews that add no value.';
 if(/customer/.test(text))return 'Example: A service team asks customers what a successful outcome looks like, then uses those expectations to set measurable requirements.';
 if(/supplier/.test(text))return 'Example: Procurement compares suppliers using quality, delivery, service, risk, and total cost rather than selecting only the lowest price.';
 if(/lead time|cycle time|wait/.test(text))return 'Example: A team measures the days from submitting a request to completing it, then removes waiting time between approvals.';
 if(/control|standard work|standardiz/.test(text))return 'Example: After improving a process, the team documents the new steps, trains users, and monitors results so performance does not slip back.';
 if(/measure|metric|data|sample/.test(text))return `Example: The team defines exactly how “${term}” will be measured, collects consistent data, and uses the result to compare performance over time.`;
 const settings=[
  'a purchasing approval process','a laboratory sample workflow','a customer support process',
  'an invoice review process','a supplier onboarding process','a production handoff'
 ];
 const setting=settings[(c.id-1)%settings.length];
 return `Example: In ${setting}, the team applies “${term}” to identify what is happening, make a focused improvement, and confirm that the result is better.`;
}
function escapeRegExp(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function applyTheme(){const dark=state.theme==='dark'||(state.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';$('#themeToggle').textContent=dark?'☀':'☾'}
function haptic(pattern=12){if(navigator.vibrate)navigator.vibrate(pattern)}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200)}
function switchView(view){currentView=view;$$('.view').forEach(v=>v.classList.toggle('active',v.id===view+'View'));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='home')renderHome();if(view==='browse')renderBrowse();if(view==='stats')renderStats();scrollTo({top:0,behavior:'smooth'})}
function activityToday(){return state.activity[todayKey()]||{reviews:0,minutes:0}}
function getStreak(){let streak=0,d=new Date();if(!(state.activity[todayKey(d)]?.reviews>0))d=new Date(Date.now()-DAY);while(state.activity[todayKey(d)]?.reviews>0){streak++;d=new Date(d.getTime()-DAY)}return streak}
function recordReview(){const k=todayKey(),a=state.activity[k]||{reviews:0,minutes:0};a.reviews++;a.minutes=Math.max(a.minutes,Math.round((now()-sessionStarted)/60000));state.activity[k]=a;state.reviews++;state.bestStreak=Math.max(state.bestStreak,getStreak());save()}

function renderHome(){
 const due=CARDS.filter(isDue).length,fav=CARDS.filter(c=>cardState(c.id).favorite).length,weak=CARDS.filter(isWeak).length,a=activityToday(),goal=state.dailyGoal||20,pct=masteryPct(),ready=readiness();
 $('#dueValue').textContent=due;$('#favoriteValue').textContent=fav;$('#weakValue').textContent=weak;$('#streakValue').textContent=getStreak();$('#goalValue').textContent=`${a.reviews}/${goal}`;$('#readinessValue').textContent=ready+'%';
 $('#masteryPct').textContent=pct+'%';$('#masteryRing').style.setProperty('--pct',pct+'%');
 const resumable=state.lastSession?.ids?.length&&state.lastSession.index<state.lastSession.ids.length;
 $('#continueStudy').textContent=resumable?'Continue Study':(due?'Study Due Cards':'Study All Cards');
 $('#heroGreeting').textContent=resumable?'Pick up where you left off':due?`${due} card${due===1?' is':'s are'} due`:'You are caught up';
 $('#heroMessage').textContent=resumable?`${state.lastSession.ids.length-state.lastSession.index} cards remain in your last session.`:'Build confidence with a focused review.';
 $('#goalText').textContent=`${a.reviews} of ${goal} reviews`;$('#goalProgress').style.width=clamp(a.reviews/goal*100,0,100)+'%';
 const strip=$('#activityStrip');strip.innerHTML='';for(let n=13;n>=0;n--){const d=new Date(Date.now()-n*DAY),v=state.activity[todayKey(d)]?.reviews||0,el=document.createElement('div');el.className='activity-day '+(v>=20?'l3':v>=8?'l2':v>0?'l1':'');el.title=`${todayKey(d)}: ${v} reviews`;strip.append(el)}
}
function resumeSession(){
 const last=state.lastSession;if(last?.ids?.length&&last.index<last.ids.length){const cards=last.ids.map(id=>CARDS.find(c=>c.id===id)).filter(Boolean);session=cards;sessionIndex=clamp(last.index,0,cards.length-1);sessionStarted=now();switchView('study');renderStudy();return}
 startSession(CARDS.some(isDue)?'due':'all');
}
function startSession(type='due',custom=null,startId=null,preserveOrder=false){
 let cards=custom?[...custom]:[...CARDS];
 if(type==='due')cards=cards.filter(isDue);if(type==='favorites')cards=cards.filter(c=>cardState(c.id).favorite);if(type==='weak')cards=cards.filter(isWeak);
 if(!cards.length){toast(type==='favorites'?'No favorites yet.':type==='weak'?'No weak concepts yet.':'No cards are due. Starting the full deck.');cards=[...CARDS]}
 if(!preserveOrder)cards=shuffle(cards);
 session=cards;sessionIndex=startId?Math.max(0,cards.findIndex(c=>c.id===startId)):0;sessionStarted=now();
 state.lastSession={ids:session.map(c=>c.id),index:sessionIndex,started:now()};save();switchView('study');renderStudy();
}
function renderStudy(){
 const c=session[sessionIndex];if(!c){finishSession();return}
 const el=$('#flashcard');el.classList.remove('flipped','swipe-left','swipe-right','swipe-back');el.style.transform='';
 $('#cardMeta').textContent=`GROUP ${c.g} • ${statusOf(c).toUpperCase()}`;$('#cardTerm').textContent=c.t||'Untitled concept';$('#cardDefinition').textContent=c.d||'This source card did not contain a text definition.';$('#cardPlain').textContent=plainEnglish(c);$('#cardExample').textContent=realWorldExample(c);
 $('#studyCounter').textContent=`${sessionIndex+1} of ${session.length}`;$('#studyProgressBar').style.width=((sessionIndex+1)/session.length*100)+'%';
 const answerScroll=$('.answer-scroll');if(answerScroll)answerScroll.scrollTop=0;const s=cardState(c.id);$('#favoriteBtn').classList.toggle('active',s.favorite);$('#favoriteBtn').textContent=s.favorite?'★':'☆';updateIntervals(c);
 state.lastSession={ids:session.map(x=>x.id),index:sessionIndex,started:state.lastSession?.started||now()};save();
}
function predicted(c,rating){
 const s=cardState(c.id),i=Math.max(1,s.interval||1),ease=clamp(s.ease||2.5,1.3,3.2);
 if(rating==='again')return s.reps===0?10/1440:1/1440*20;
 if(rating==='hard')return s.reps===0?1:Math.max(1,Math.round(i*1.2));
 if(rating==='good')return s.reps===0?3:s.reps===1?6:Math.max(2,Math.round(i*ease));
 return s.reps===0?7:s.reps===1?14:Math.max(4,Math.round(i*ease*1.35));
}
function fmtInterval(days){if(days<1)return Math.max(1,Math.round(days*1440))+'m';if(days<30)return Math.round(days)+'d';if(days<365)return Math.round(days/30)+'mo';return (days/365).toFixed(1)+'y'}
function updateIntervals(c){['again','hard','good','easy'].forEach(r=>$('#'+r+'Interval').textContent=fmtInterval(predicted(c,r)))}
function rateCurrent(rating){
 const c=session[sessionIndex];if(!c)return;const s=cardState(c.id),days=predicted(c,rating);
 if(rating==='again'){s.lapses++;s.reps=0;s.ease=Math.max(1.3,s.ease-.2);s.status='learning'}
 if(rating==='hard'){s.reps++;s.ease=Math.max(1.3,s.ease-.05);s.status='learning'}
 if(rating==='good'){s.reps++;s.status='learning'}
 if(rating==='easy'){s.reps+=2;s.ease=Math.min(3.2,s.ease+.15);s.status='learning'}
 s.interval=days;s.last=now();s.due=now()+days*DAY;recordReview();haptic(rating==='again'?[25,35,25]:15);
 const el=$('#flashcard');el.classList.add(rating==='again'?'swipe-left':'swipe-right');setTimeout(()=>{sessionIndex++;renderStudy()},230);
}
function finishSession(){state.lastSession=null;save();toast('Session complete. Great work.');switchView('home')}

function renderBrowse(){
 const q=clean($('#searchInput').value).toLowerCase(),g=$('#groupFilter').value,st=$('#statusFilter').value,sort=$('#sortFilter').value;
 filteredCards=CARDS.filter(c=>{const hay=`${c.t} ${c.d} group ${c.g}`.toLowerCase(),matchQ=!q||q.split(' ').every(term=>hay.includes(term)),matchG=g==='all'||String(c.g)===g;let matchS=true;if(st==='due')matchS=isDue(c);else if(st==='favorites')matchS=cardState(c.id).favorite;else if(st==='weak')matchS=isWeak(c);else if(st!=='all')matchS=statusOf(c)===st;return matchQ&&matchG&&matchS});
 if(sort==='az')filteredCards.sort((a,b)=>a.t.localeCompare(b.t));if(sort==='za')filteredCards.sort((a,b)=>b.t.localeCompare(a.t));if(sort==='weak')filteredCards.sort((a,b)=>weakness(b)-weakness(a));if(sort==='due')filteredCards.sort((a,b)=>(cardState(a.id).due||0)-(cardState(b.id).due||0));
 $('#browseCount').textContent=`${filteredCards.length} card${filteredCards.length===1?'':'s'}`;
 const list=$('#cardList');list.innerHTML='';filteredCards.forEach(c=>{const s=cardState(c.id),el=document.createElement('article');el.className='list-card';el.innerHTML=`<div class="list-main"><h3>${escapeHtml(c.t||'Untitled')}</h3><p>${escapeHtml((c.d||'No text definition').slice(0,155))}</p><div class="list-badges"><span class="badge">Group ${c.g}</span><span class="badge">${statusOf(c)}</span>${isWeak(c)?'<span class="badge weak">weak</span>':''}</div></div><button class="bookmark-btn" aria-label="Bookmark">${s.favorite?'★':'☆'}</button>`;el.querySelector('.list-main').onclick=()=>startSession('all',filteredCards,c.id,true);el.querySelector('.bookmark-btn').onclick=e=>{e.stopPropagation();s.favorite=!s.favorite;save();renderBrowse();toast(s.favorite?'Added to favorites':'Removed from favorites')};list.append(el)});
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}

function quizPool(source){if(source==='due')return CARDS.filter(isDue);if(source==='favorites')return CARDS.filter(c=>cardState(c.id).favorite);if(source==='weak')return CARDS.filter(isWeak);if(['1','2','3','4'].includes(source))return CARDS.filter(c=>String(c.g)===source);return CARDS}
function startQuiz(){
 const pool=quizPool($('#quizSource').value);if(pool.length<4){toast('Choose a source with at least four cards.');return}
 const raw=$('#quizLength').value,count=raw==='random'?Math.min(pool.length,10+Math.floor(Math.random()*41)):Math.min(pool.length,Number(raw));
 quizCards=shuffle(pool).slice(0,count);quizIndex=0;quizCorrect=0;quizAnswered=false;quizIncorrect=[];$('#quizSetup').hidden=true;$('#quizResults').hidden=true;$('#quizPlay').hidden=false;renderQuiz();
}
function renderQuiz(){
 if(quizIndex>=quizCards.length){finishQuiz();return}
 const c=quizCards[quizIndex];quizAnswered=false;$('#quizProgress').textContent=`Question ${quizIndex+1} of ${quizCards.length}`;$('#quizScore').textContent=`${quizCorrect} correct`;$('#quizTerm').textContent=c.t;$('#quizFeedback').innerHTML='';$('#nextQuestion').disabled=true;
 const distractors=shuffle(CARDS.filter(x=>x.id!==c.id&&x.d)).slice(0,3),opts=shuffle([c,...distractors]),wrap=$('#quizChoices');wrap.innerHTML='';opts.forEach(o=>{const b=document.createElement('button');b.className='choice';b.textContent=o.d||'No text definition';b.onclick=()=>answerQuiz(b,o.id===c.id,c);wrap.append(b)});
}
function answerQuiz(btn,correct,c){
 if(quizAnswered)return;quizAnswered=true;const s=cardState(c.id);state.quiz.total++;
 if(correct){quizCorrect++;state.quiz.correct++;s.correct++;btn.classList.add('correct');$('#quizFeedback').innerHTML=`<b>Correct.</b><p>${escapeHtml(plainEnglish(c))}</p>`;haptic(12)}
 else{s.wrong++;quizIncorrect.push(c.id);btn.classList.add('wrong');[...$('#quizChoices').children].find(x=>x.textContent===(c.d||'No text definition'))?.classList.add('correct');$('#quizFeedback').innerHTML=`<b>Review this concept.</b><p>${escapeHtml(plainEnglish(c))}</p>`;haptic([25,35,25])}
 save();$('#quizScore').textContent=`${quizCorrect} correct`;$('#nextQuestion').disabled=false;
}
function finishQuiz(){
 const score=Math.round(quizCorrect/quizCards.length*100);state.quiz.history.push({date:now(),score,total:quizCards.length,correct:quizCorrect,incorrect:[...quizIncorrect]});state.quiz.history=state.quiz.history.slice(-50);save();
 $('#quizPlay').hidden=true;const r=$('#quizResults');r.hidden=false;r.innerHTML=`<span class="eyebrow">Results</span><h2>${score}%</h2><p>${quizCorrect} correct out of ${quizCards.length}</p><div class="result-actions"><button class="primary-btn" id="reviewWrong"${quizIncorrect.length?'':' disabled'}>Review incorrect (${quizIncorrect.length})</button><button class="text-btn" id="newQuiz">New quiz</button></div>`;
 $('#newQuiz').onclick=()=>{r.hidden=true;$('#quizSetup').hidden=false};$('#reviewWrong').onclick=()=>{const cards=quizIncorrect.map(id=>CARDS.find(c=>c.id===id)).filter(Boolean);startSession('all',cards,null,true)};
}

function renderStats(){
 const acc=state.quiz.total?Math.round(state.quiz.correct/state.quiz.total*100):0,pct=masteryPct(),ready=readiness();
 $('#statsStreak').textContent=getStreak();$('#statsBest').textContent=state.bestStreak||0;$('#statsAccuracy').textContent=acc+'%';$('#statsReviews').textContent=state.reviews||0;$('#statsReadiness').textContent=ready+'%';$('#statsMastery').textContent=pct+'%';
 const gs=$('#groupStats');gs.innerHTML='';[1,2,3,4].forEach(g=>{const cards=CARDS.filter(c=>c.g===g),p=masteryPct(cards);gs.innerHTML+=`<div class="group-row"><div class="row-label"><span>Group ${g}</span><b>${p}%</b></div><div class="mini-track"><div style="width:${p}%"></div></div></div>`});
 const hm=$('#heatmap');hm.innerHTML='';for(let n=27;n>=0;n--){const d=new Date(Date.now()-n*DAY),v=state.activity[todayKey(d)]?.reviews||0,el=document.createElement('div');el.className=v>=20?'l3':v>=8?'l2':v>0?'l1':'';el.title=`${todayKey(d)}: ${v} reviews`;hm.append(el)}
 const weak=CARDS.filter(isWeak).sort((a,b)=>weakness(b)-weakness(a)).slice(0,8),ws=$('#weakStats');ws.innerHTML=weak.length?weak.map(c=>`<button class="concept-row" data-id="${c.id}"><span>${escapeHtml(c.t)}</span><small>Group ${c.g} • ${cardState(c.id).lapses} lapses</small></button>`).join(''):'<p class="muted">No weak concepts yet.</p>';$$('.concept-row').forEach(b=>b.onclick=()=>startSession('all',[CARDS.find(c=>c.id===Number(b.dataset.id))],null,true));
}

$$('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$$('.quick-card[data-session]').forEach(b=>b.onclick=()=>startSession(b.dataset.session));
$('#continueStudy').onclick=resumeSession;$('#dueCard').onclick=()=>startSession('due');$('#weakCard').onclick=()=>startSession('weak');$('#favoritesCard').onclick=()=>startSession('favorites');
$('#closeStudy').onclick=()=>switchView('home');$('#flashcard').onclick=()=>{if(wasScrolling){wasScrolling=false;return}$('#flashcard').classList.toggle('flipped')};$('#flashcard').onkeydown=e=>{if(e.key===' '||e.key==='Enter')$('#flashcard').classList.toggle('flipped')};
$$('.rating').forEach(b=>b.onclick=()=>rateCurrent(b.dataset.rating));
$('#favoriteBtn').onclick=()=>{const c=session[sessionIndex],s=cardState(c.id);s.favorite=!s.favorite;save();renderStudy();toast(s.favorite?'Added to favorites':'Removed from favorites')};
$('#themeToggle').onclick=()=>{state.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';save();applyTheme()};
$('#searchInput').oninput=renderBrowse;$('#groupFilter').onchange=renderBrowse;$('#statusFilter').onchange=renderBrowse;$('#sortFilter').onchange=renderBrowse;$('#studyFiltered').onclick=()=>startSession('all',filteredCards,null,true);$('#filterToggle').onclick=()=>$('#filters').toggleAttribute('hidden');
$('#startQuiz').onclick=startQuiz;$('#nextQuestion').onclick=()=>{quizIndex++;renderQuiz()};
$('#changeGoal').onclick=()=>$('#goalModal').classList.add('show');$('#closeGoal').onclick=()=>$('#goalModal').classList.remove('show');$$('.goal-options button').forEach(b=>b.onclick=()=>{state.dailyGoal=Number(b.dataset.goal);save();$('#goalModal').classList.remove('show');renderHome();toast('Daily goal updated')});
$('#resetData').onclick=()=>{if(confirm('Reset all Six Sigma study data on this device?')){localStorage.removeItem(KEY);location.reload()}};
$('#swipeStage').addEventListener('touchstart',e=>{touchStartX=e.touches[0].clientX;touchStartY=e.touches[0].clientY;touchDeltaX=0;touchDeltaY=0;wasScrolling=false},{passive:true});
$('#swipeStage').addEventListener('touchmove',e=>{touchDeltaX=e.touches[0].clientX-touchStartX;touchDeltaY=e.touches[0].clientY-touchStartY;if(Math.abs(touchDeltaY)>10)wasScrolling=true;const el=$('#flashcard');if(Math.abs(touchDeltaX)>Math.abs(touchDeltaY)&&Math.abs(touchDeltaX)<130)el.style.transform=`translateX(${touchDeltaX*.35}px) rotate(${touchDeltaX*.025}deg)${el.classList.contains('flipped')?' rotateY(180deg)':''}`},{passive:true});
$('#swipeStage').addEventListener('touchend',()=>{const el=$('#flashcard');el.style.transform='';if(Math.abs(touchDeltaX)>85&&Math.abs(touchDeltaX)>Math.abs(touchDeltaY))rateCurrent(touchDeltaX<0?'again':'good')});
matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',()=>{if(state.theme==='system')applyTheme()});
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
applyTheme();renderHome();renderBrowse();
})();