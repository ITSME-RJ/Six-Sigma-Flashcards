(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const DAY = 86400000;
  const KEY = 'sixSigmaV2';
  const OLD_KEY = 'sixSigmaProgress';
  const todayKey = (d = new Date()) => d.toISOString().slice(0,10);
  const now = () => Date.now();
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const shuffle = a => [...a].sort(() => Math.random() - .5);
  const state = loadState();
  let currentView = 'home';
  let session = [], sessionIndex = 0, sessionStarted = 0;
  let quizCards = [], quizIndex = 0, quizCorrect = 0, quizAnswered = false;
  let filteredCards = [];
  let touchStartX = 0, touchDeltaX = 0;

  window.CARDS = window.CARDS || [];
  CARDS.forEach((c,i) => { c.id = i + 1; c.t = clean(c.t); c.d = clean(c.d); });
  migrateOldProgress();

  function clean(v){ return String(v || '').replace(/\s+/g,' ').trim(); }
  function defaultState(){ return {version:2,cards:{},activity:{},dailyGoal:20,quiz:{correct:0,total:0},reviews:0,bestStreak:0,theme:'system'}; }
  function loadState(){ try { return {...defaultState(),...JSON.parse(localStorage.getItem(KEY)||'{}')}; } catch { return defaultState(); } }
  function save(){ localStorage.setItem(KEY,JSON.stringify(state)); }
  function cardState(id){
    if(!state.cards[id]) state.cards[id]={ease:2.5,interval:0,reps:0,lapses:0,due:0,last:0,favorite:false,status:'new'};
    return state.cards[id];
  }
  function migrateOldProgress(){
    if(state.migrated) return;
    try{
      const old=JSON.parse(localStorage.getItem(OLD_KEY)||'{}');
      Object.entries(old).forEach(([id,v])=>{
        const s=cardState(id);
        if(v.level==='known'){s.status='learning';s.reps=1;s.interval=1;s.due=now();}
        if(v.level==='learning'){s.status='learning';s.due=now();}
      });
    }catch{}
    state.migrated=true; save();
  }
  function isDue(c){ const s=cardState(c.id); return s.status==='new'||s.due<=now(); }
  function mastered(c){ const s=cardState(c.id); return s.reps>=4 && s.interval>=14; }
  function statusOf(c){ const s=cardState(c.id); return mastered(c)?'mastered':s.status; }
  function plainEnglish(c){
    if(!c.d) return `This card is a visual or summary concept. Connect “${c.t}” to the related ideas in its group.`;
    return c.d.replace(/^A |^An |^The /,'').replace(/\brefers to\b|\bis defined as\b|\bis the\b/i,'means').slice(0,330);
  }
  function memoryPrompt(c){ return `Picture a real process at work or home. Where would “${c.t}” appear, and what would improve if you applied it correctly?`; }
  function applyTheme(){
    const dark = state.theme==='dark'||(state.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);
    document.documentElement.dataset.theme=dark?'dark':'light'; $('#themeToggle').textContent=dark?'☀':'☾';
  }
  function switchView(view){
    currentView=view; $$('.view').forEach(v=>v.classList.toggle('active',v.id===view+'View'));
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    if(view==='home') renderHome(); if(view==='browse') renderBrowse(); if(view==='quiz'&&!quizCards.length) startQuiz(); if(view==='stats') renderStats();
    scrollTo({top:0,behavior:'smooth'});
  }
  function activityToday(){ return state.activity[todayKey()]||{reviews:0,minutes:0}; }
  function recordReview(){
    const k=todayKey(), a=state.activity[k]||{reviews:0,minutes:0}; a.reviews++; a.minutes=Math.max(a.minutes,Math.round((now()-sessionStarted)/60000)); state.activity[k]=a; state.reviews++;
    const streak=getStreak(); state.bestStreak=Math.max(state.bestStreak,streak); save();
  }
  function getStreak(){
    let streak=0,d=new Date();
    if(!(state.activity[todayKey(d)]?.reviews>0)) d=new Date(Date.now()-DAY);
    while(state.activity[todayKey(d)]?.reviews>0){streak++;d=new Date(d.getTime()-DAY)} return streak;
  }
  function renderHome(){
    const due=CARDS.filter(isDue).length, fav=CARDS.filter(c=>cardState(c.id).favorite).length, master=CARDS.filter(mastered).length;
    const pct=Math.round(master/CARDS.length*100), a=activityToday(), streak=getStreak();
    $('#dueValue').textContent=due; $('#favoriteValue').textContent=fav; $('#reviewedValue').textContent=a.reviews; $('#streakValue').textContent=streak;
    $('#masteryPct').textContent=pct+'%'; $('#masteryRing').style.setProperty('--pct',pct+'%');
    $('#heroGreeting').textContent=due?`${due} card${due===1?' is':'s are'} due`:'You are caught up';
    $('#heroMessage').textContent=due?'A focused review will strengthen the concepts that need attention.':'Browse the deck or take a quiz to keep building mastery.';
    $('#startDue').textContent=due?'Study due cards':'Study all cards';
    const goal=state.dailyGoal||20, progress=clamp(a.reviews/goal*100,0,100); $('#goalProgress').style.width=progress+'%'; $('#goalText').textContent=`${a.reviews} of ${goal} cards today`;
    const acc=state.quiz.total?Math.round(state.quiz.correct/state.quiz.total*100):0; $('#accuracyText').textContent=`${acc}% accuracy`;
    const strip=$('#activityStrip'); strip.innerHTML=''; for(let n=13;n>=0;n--){const d=new Date(Date.now()-n*DAY),v=state.activity[todayKey(d)]?.reviews||0,el=document.createElement('div');el.className='activity-day '+(v>=20?'l3':v>=8?'l2':v>0?'l1':'');el.title=`${todayKey(d)}: ${v} reviews`;strip.append(el)}
  }
  function startSession(type='due', custom=null){
    let cards=custom||CARDS;
    if(type==='due') cards=cards.filter(isDue);
    if(type==='favorites') cards=cards.filter(c=>cardState(c.id).favorite);
    if(!cards.length){ toast(type==='favorites'?'No favorite cards yet.':'No cards are due. Starting the full deck.'); cards=CARDS; }
    session=shuffle(cards); sessionIndex=0; sessionStarted=now(); switchView('study'); renderStudy();
  }
  function renderStudy(){
    const c=session[sessionIndex]; if(!c){finishSession();return}
    $('#flashcard').classList.remove('flipped','swipe-left','swipe-right');
    $('#cardMeta').textContent=`GROUP ${c.g} • ${statusOf(c).toUpperCase()}`; $('#cardTerm').textContent=c.t||'Untitled concept'; $('#cardDefinition').textContent=c.d||'This source card did not contain a text definition.'; $('#cardPlain').textContent=plainEnglish(c); $('#cardExample').textContent=memoryPrompt(c);
    $('#studyCounter').textContent=`${sessionIndex+1} of ${session.length}`; $('#studyProgressBar').style.width=((sessionIndex)/session.length*100)+'%';
    $('#favoriteBtn').classList.toggle('active',cardState(c.id).favorite); $('#favoriteBtn').textContent=cardState(c.id).favorite?'★':'☆'; updateIntervals(c);
  }
  function predicted(c,rating){
    const s=cardState(c.id), i=Math.max(1,s.interval||1);
    if(rating==='again') return 10/1440;
    if(rating==='hard') return Math.max(1,Math.round(i*1.2));
    if(rating==='good') return s.reps===0?3:Math.max(2,Math.round(i*s.ease));
    return s.reps===0?7:Math.max(4,Math.round(i*s.ease*1.35));
  }
  function fmtInterval(days){ if(days<1)return Math.round(days*1440)+'m'; if(days<30)return Math.round(days)+'d'; return Math.round(days/30)+'mo'; }
  function updateIntervals(c){ ['again','hard','good','easy'].forEach(r=>$('#'+r+'Interval').textContent=fmtInterval(predicted(c,r))); }
  function rateCurrent(rating){
    const c=session[sessionIndex], s=cardState(c.id), days=predicted(c,rating);
    if(rating==='again'){s.lapses++;s.reps=0;s.ease=Math.max(1.3,s.ease-.2);s.status='learning';}
    if(rating==='hard'){s.reps++;s.ease=Math.max(1.3,s.ease-.05);s.status='learning';}
    if(rating==='good'){s.reps++;s.status='learning';}
    if(rating==='easy'){s.reps+=2;s.ease=Math.min(3.2,s.ease+.15);s.status='learning';}
    s.interval=days;s.last=now();s.due=now()+days*DAY;recordReview();
    const el=$('#flashcard');el.classList.add(rating==='again'?'swipe-left':'swipe-right'); if(navigator.vibrate)navigator.vibrate(15);
    setTimeout(()=>{sessionIndex++;renderStudy()},220);
  }
  function finishSession(){ toast('Session complete. Great work.'); switchView('home'); }
  function renderBrowse(){
    const q=$('#searchInput').value.toLowerCase(), g=$('#groupFilter').value, st=$('#statusFilter').value;
    filteredCards=CARDS.filter(c=>{
      const matchQ=!q||(c.t+' '+c.d).toLowerCase().includes(q), matchG=g==='all'||String(c.g)===g;
      let matchS=true;if(st==='due')matchS=isDue(c);else if(st==='favorites')matchS=cardState(c.id).favorite;else if(st!=='all')matchS=statusOf(c)===st;
      return matchQ&&matchG&&matchS;
    });
    $('#browseCount').textContent=`${filteredCards.length} card${filteredCards.length===1?'':'s'}`;
    const list=$('#cardList'); list.innerHTML=''; filteredCards.slice(0,120).forEach(c=>{
      const s=cardState(c.id),el=document.createElement('article');el.className='list-card';el.innerHTML=`<div><h3>${escapeHtml(c.t||'Untitled')}</h3><p>${escapeHtml((c.d||'No text definition').slice(0,150))}</p><div class="list-badges"><span class="badge">Group ${c.g}</span><span class="badge">${statusOf(c)}</span></div></div><div class="star">${s.favorite?'★':'›'}</div>`;
      el.onclick=()=>startSession('all',[c]);list.append(el);
    });
    if(filteredCards.length>120){const p=document.createElement('p');p.className='muted';p.textContent='Showing the first 120 matches. Refine your search to narrow the list.';list.append(p)}
  }
  function startQuiz(){
    quizCards=shuffle(CARDS).slice(0,10);quizIndex=0;quizCorrect=0;quizAnswered=false;renderQuiz();
  }
  function renderQuiz(){
    if(quizIndex>=quizCards.length){
      $('#quizTerm').textContent='Quiz complete';$('#quizChoices').innerHTML='';$('#quizFeedback').textContent=`You scored ${quizCorrect} out of ${quizCards.length}.`;$('#nextQuestion').disabled=false;$('#nextQuestion').textContent='Start another quiz';return;
    }
    const c=quizCards[quizIndex];quizAnswered=false;$('#quizProgress').textContent=`Question ${quizIndex+1} of ${quizCards.length}`;$('#quizScore').textContent=`${quizCorrect} correct`;$('#quizTerm').textContent=c.t;$('#quizFeedback').textContent='';$('#nextQuestion').disabled=true;$('#nextQuestion').textContent='Next question';
    const opts=shuffle([c,...shuffle(CARDS.filter(x=>x.id!==c.id&&x.d)).slice(0,3)]),wrap=$('#quizChoices');wrap.innerHTML='';opts.forEach(o=>{const b=document.createElement('button');b.className='choice';b.textContent=o.d||'No text definition';b.onclick=()=>answerQuiz(b,o.id===c.id,c);wrap.append(b)});
  }
  function answerQuiz(btn,correct,c){
    if(quizAnswered)return;quizAnswered=true;state.quiz.total++;if(correct){quizCorrect++;state.quiz.correct++;btn.classList.add('correct');$('#quizFeedback').textContent='Correct. Nice work.';}else{btn.classList.add('wrong');[...$('#quizChoices').children].find(x=>x.textContent===(c.d||'No text definition'))?.classList.add('correct');$('#quizFeedback').textContent='Not quite. The correct answer is highlighted.';}
    save();$('#quizScore').textContent=`${quizCorrect} correct`;$('#nextQuestion').disabled=false;
  }
  function renderStats(){
    const acc=state.quiz.total?Math.round(state.quiz.correct/state.quiz.total*100):0;$('#statsStreak').textContent=getStreak();$('#statsBest').textContent=state.bestStreak||0;$('#statsAccuracy').textContent=acc+'%';$('#statsReviews').textContent=state.reviews||0;
    const counts={new:0,learning:0,mastered:0};CARDS.forEach(c=>counts[statusOf(c)]++);const mb=$('#masteryBars');mb.innerHTML='';Object.entries(counts).forEach(([k,v])=>{mb.innerHTML+=`<div class="mastery-row"><div class="row-label"><span>${title(k)}</span><b>${v}</b></div><div class="mini-track"><div style="width:${v/CARDS.length*100}%"></div></div></div>`});
    const gs=$('#groupStats');gs.innerHTML='';[1,2,3,4].forEach(g=>{const cards=CARDS.filter(c=>c.g===g),m=cards.filter(mastered).length,p=Math.round(m/cards.length*100);gs.innerHTML+=`<div class="group-row"><div class="row-label"><span>Group ${g}</span><b>${p}%</b></div><div class="mini-track"><div style="width:${p}%"></div></div></div>`});
  }
  function title(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  function escapeHtml(s){return s.replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2200)}

  $$('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  $$('.quick-card[data-session]').forEach(b=>b.onclick=()=>startSession(b.dataset.session));
  $('#startDue').onclick=()=>startSession(CARDS.some(isDue)?'due':'all');$('#startQuizHome').onclick=()=>{switchView('quiz');startQuiz()};
  $('#closeStudy').onclick=()=>switchView('home');$('#flashcard').onclick=()=>$('#flashcard').classList.toggle('flipped');
  $('#flashcard').onkeydown=e=>{if(e.key===' '||e.key==='Enter')$('#flashcard').classList.toggle('flipped')};
  $$('.rating').forEach(b=>b.onclick=()=>rateCurrent(b.dataset.rating));
  $('#favoriteBtn').onclick=()=>{const c=session[sessionIndex],s=cardState(c.id);s.favorite=!s.favorite;save();renderStudy();toast(s.favorite?'Added to favorites':'Removed from favorites')};
  $('#themeToggle').onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';state.theme=dark?'light':'dark';save();applyTheme()};
  $('#searchInput').oninput=renderBrowse;$('#groupFilter').onchange=renderBrowse;$('#statusFilter').onchange=renderBrowse;$('#studyFiltered').onclick=()=>startSession('all',filteredCards);
  $('#filterToggle').onclick=()=>$('#filters').toggleAttribute('hidden');$('#restartQuiz').onclick=startQuiz;
  $('#nextQuestion').onclick=()=>{if(quizIndex>=quizCards.length){startQuiz();return}quizIndex++;renderQuiz()};
  $('#changeGoal').onclick=()=>$('#goalModal').classList.add('show');$('#closeGoal').onclick=()=>$('#goalModal').classList.remove('show');
  $$('.goal-options button').forEach(b=>b.onclick=()=>{state.dailyGoal=Number(b.dataset.goal);save();$('#goalModal').classList.remove('show');renderHome();toast('Daily goal updated')});
  $('#resetData').onclick=()=>{if(confirm('Reset all Six Sigma study data on this device?')){localStorage.removeItem(KEY);location.reload()}};
  $('#swipeStage').addEventListener('touchstart',e=>{touchStartX=e.touches[0].clientX;touchDeltaX=0},{passive:true});
  $('#swipeStage').addEventListener('touchmove',e=>{touchDeltaX=e.touches[0].clientX-touchStartX},{passive:true});
  $('#swipeStage').addEventListener('touchend',()=>{if(Math.abs(touchDeltaX)>80)rateCurrent(touchDeltaX<0?'again':'good')});
  matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',()=>{if(state.theme==='system')applyTheme()});
  if('serviceWorker' in navigator) addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
  applyTheme();renderHome();renderBrowse();
})();
