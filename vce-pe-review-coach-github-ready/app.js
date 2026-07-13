
const STORAGE_KEY = "vce-pe-review-coach-v1";
const REVIEW_STAGES = [
  { days: 2, label: "2-day review", points: 20 },
  { days: 7, label: "7-day review", points: 35 },
  { days: 30, label: "30-day review", points: 60 }
];

const BADGES = [
  { id:"first", icon:"🌟", name:"First Retrieval", test:s=>s.totalReviews>=1 },
  { id:"five", icon:"🧠", name:"Memory Builder", test:s=>s.totalReviews>=5 },
  { id:"ten", icon:"🏅", name:"10 Reviews", test:s=>s.totalReviews>=10 },
  { id:"streak3", icon:"🔥", name:"3-Day Streak", test:s=>s.streak>=3 },
  { id:"streak7", icon:"⚡", name:"7-Day Streak", test:s=>s.streak>=7 },
  { id:"master", icon:"🏆", name:"Topic Master", test:s=>s.topics.some(t=>t.reviews.length>=3) }
];

let state = loadState();
let currentFilter = "all";
let activeReview = null;
let deferredInstallPrompt = null;

const $ = id => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0,10);
$("learnedDate").value = todayISO();

function loadState(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      topics:[], points:0, totalReviews:0, streak:0, lastReviewDate:null
    };
  }catch{
    return {topics:[], points:0, totalReviews:0, streak:0, lastReviewDate:null};
  }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function addDays(dateString, days){
  const d = new Date(dateString + "T12:00:00");
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function friendlyDate(dateString){
  return new Intl.DateTimeFormat("en-AU",{day:"numeric",month:"short",year:"numeric"})
    .format(new Date(dateString+"T12:00:00"));
}
function daysBetween(a,b){
  const ms = new Date(b+"T12:00:00") - new Date(a+"T12:00:00");
  return Math.round(ms/86400000);
}
function getNextStage(topic){
  return REVIEW_STAGES[topic.reviews.length] || null;
}
function getDueDate(topic){
  const stage = getNextStage(topic);
  return stage ? addDays(topic.learnedDate, stage.days) : null;
}
function isDue(topic){
  const due = getDueDate(topic);
  return due && due <= todayISO();
}
function statusText(topic){
  const due = getDueDate(topic);
  if(!due) return "Review cycle complete";
  const diff = daysBetween(todayISO(),due);
  if(diff < 0) return `${Math.abs(diff)} day${Math.abs(diff)===1?"":"s"} overdue`;
  if(diff === 0) return "Due today";
  return `Due in ${diff} day${diff===1?"":"s"}`;
}
function defaultPrompt(topic){
  return `Without using your notes, explain the key VCE PE knowledge, terminology and a relevant sporting example for: ${topic.name}.`;
}
function showToast(message){
  const toast=$("toast");
  toast.textContent=message;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),2600);
}
function updateStreak(){
  const today=todayISO();
  if(state.lastReviewDate===today) return;
  if(!state.lastReviewDate) state.streak=1;
  else{
    const gap=daysBetween(state.lastReviewDate,today);
    state.streak = gap===1 ? state.streak+1 : 1;
  }
  state.lastReviewDate=today;
}
function summary(){
  return {
    totalReviews:state.totalReviews,
    streak:state.streak,
    topics:state.topics
  };
}
function earnedBadges(){
  const s=summary();
  return BADGES.filter(b=>b.test(s));
}
function renderStats(){
  const level=Math.floor(state.points/100)+1;
  const xp=state.points%100;
  $("levelValue").textContent=level;
  $("xpLabel").textContent=`${xp} / 100 XP`;
  $("pointsLabel").textContent=`${state.points} points`;
  $("xpBar").style.width=`${xp}%`;
  $("levelMessage").textContent=`${100-xp} XP until Level ${level+1}`;
  $("streakStat").textContent=state.streak;
  $("reviewsStat").textContent=state.totalReviews;
  $("topicsStat").textContent=state.topics.length;
  $("badgesStat").textContent=earnedBadges().length;
}
function renderBadges(){
  $("badgeGrid").innerHTML="";
  const earned=earnedBadges().map(b=>b.id);
  BADGES.forEach(b=>{
    const item=document.createElement("div");
    item.className=`badge ${earned.includes(b.id)?"earned":""}`;
    item.innerHTML=`<span>${b.icon}</span><strong>${b.name}</strong>`;
    $("badgeGrid").appendChild(item);
  });
}
function renderQueue(){
  const dueTopics=state.topics.filter(isDue).sort((a,b)=>getDueDate(a).localeCompare(getDueDate(b)));
  $("reviewQueue").innerHTML="";
  $("duePill").textContent=`${dueTopics.length} due`;
  $("emptyQueue").style.display=dueTopics.length?"none":"block";

  dueTopics.forEach(topic=>{
    const stage=getNextStage(topic);
    const card=document.createElement("article");
    const overdue=getDueDate(topic)<todayISO();
    card.className="review-card";
    card.innerHTML=`
      <div class="review-meta">
        <span class="review-stage">${stage.label.toUpperCase()}</span>
        <span class="${overdue?"overdue":"due-today"}">${statusText(topic)}</span>
      </div>
      <h3>${escapeHTML(topic.name)}</h3>
      <p>${escapeHTML(topic.unit)} · ${escapeHTML(topic.area)}</p>
      <p>${escapeHTML(topic.prompt || defaultPrompt(topic))}</p>
      <div class="review-footer">
        <span class="reward">+${stage.points} points</span>
        <button class="btn primary">Start retrieval</button>
      </div>`;
    card.querySelector("button").addEventListener("click",()=>openReview(topic.id));
    $("reviewQueue").appendChild(card);
  });
}
function renderTopics(){
  let topics=[...state.topics].sort((a,b)=>b.learnedDate.localeCompare(a.learnedDate));
  if(currentFilter==="due") topics=topics.filter(isDue);
  if(currentFilter==="complete") topics=topics.filter(t=>!getNextStage(t));

  $("topicList").innerHTML="";
  if(!topics.length){
    $("topicList").innerHTML=`<div class="empty"><div>📘</div><h3>No topics here yet.</h3><p>Use the form to add your first VCE PE topic.</p></div>`;
    return;
  }

  topics.forEach(topic=>{
    const card=document.createElement("article");
    card.className="topic-card";
    const stages=REVIEW_STAGES.map((stage,index)=>{
      const done=topic.reviews.length>index;
      const due=!done && topic.reviews.length===index && isDue(topic);
      return `<div class="step ${done?"done":due?"due":""}">${done?"✓ ":due?"Due ":""}${stage.days} days</div>`;
    }).join("");
    card.innerHTML=`
      <div class="topic-top">
        <span class="topic-unit">${escapeHTML(topic.unit)}</span>
        <div class="topic-actions">
          <button class="icon-btn edit" title="Edit">✏️</button>
          <button class="icon-btn delete" title="Delete">🗑️</button>
        </div>
      </div>
      <h3>${escapeHTML(topic.name)}</h3>
      <p>${escapeHTML(topic.area)}</p>
      <div class="timeline">${stages}</div>
      <div class="topic-bottom">
        <span>Learned ${friendlyDate(topic.learnedDate)}</span>
        <strong>${statusText(topic)}</strong>
      </div>`;
    card.querySelector(".delete").addEventListener("click",()=>{
      if(confirm(`Delete "${topic.name}"?`)){
        state.topics=state.topics.filter(t=>t.id!==topic.id);
        saveState(); render(); showToast("Topic deleted");
      }
    });
    card.querySelector(".edit").addEventListener("click",()=>editTopic(topic.id));
    $("topicList").appendChild(card);
  });
}
function render(){renderStats();renderBadges();renderQueue();renderTopics();}

function escapeHTML(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

$("topicForm").addEventListener("submit",e=>{
  e.preventDefault();
  const topic={
    id:crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    unit:$("unit").value,
    area:$("area").value.trim(),
    name:$("topic").value.trim(),
    learnedDate:$("learnedDate").value,
    prompt:$("prompt").value.trim(),
    reviews:[]
  };
  state.topics.push(topic);
  saveState();
  e.target.reset();
  $("unit").value="Unit 3";
  $("learnedDate").value=todayISO();
  render();
  showToast("Topic added. Review dates scheduled.");
});

function editTopic(id){
  const topic=state.topics.find(t=>t.id===id);
  if(!topic)return;
  const name=prompt("Edit content learned:",topic.name);
  if(name===null)return;
  const retrieval=prompt("Edit retrieval prompt:",topic.prompt || defaultPrompt(topic));
  if(retrieval===null)return;
  topic.name=name.trim()||topic.name;
  topic.prompt=retrieval.trim();
  saveState();render();showToast("Topic updated");
}

function openReview(id){
  activeReview=state.topics.find(t=>t.id===id);
  if(!activeReview)return;
  const stage=getNextStage(activeReview);
  $("dialogStage").textContent=stage.label.toUpperCase();
  $("dialogTopic").textContent=activeReview.name;
  $("dialogPrompt").textContent=activeReview.prompt || defaultPrompt(activeReview);
  $("confidence").value=3;
  $("confidenceNumber").textContent=3;
  $("reflection").value="";
  $("reviewDialog").showModal();
}
$("confidence").addEventListener("input",e=>$("confidenceNumber").textContent=e.target.value);
$("closeDialog").addEventListener("click",()=>$("reviewDialog").close());
$("cancelReview").addEventListener("click",()=>$("reviewDialog").close());

$("completeReview").addEventListener("click",()=>{
  if(!activeReview)return;
  const stage=getNextStage(activeReview);
  activeReview.reviews.push({
    stageDays:stage.days,
    completedDate:todayISO(),
    confidence:Number($("confidence").value),
    reflection:$("reflection").value.trim()
  });
  state.points+=stage.points;
  state.totalReviews+=1;
  updateStreak();
  saveState();
  $("reviewDialog").close();
  render();
  showToast(`Review complete! +${stage.points} points`);
  activeReview=null;
});

document.querySelectorAll(".filter").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter=btn.dataset.filter;
    renderTopics();
  });
});

$("exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`vce-pe-review-backup-${todayISO()}.json`;a.click();
  URL.revokeObjectURL(url);
});

$("importInput").addEventListener("change",async e=>{
  const file=e.target.files[0];
  if(!file)return;
  try{
    const imported=JSON.parse(await file.text());
    if(!Array.isArray(imported.topics))throw new Error();
    state=imported;saveState();render();showToast("Backup imported");
  }catch{alert("That file is not a valid VCE PE Review Coach backup.");}
  e.target.value="";
});

$("resetBtn").addEventListener("click",()=>{
  if(confirm("Reset all topics, points, badges and review history?")){
    localStorage.removeItem(STORAGE_KEY);
    state=loadState();
    render();
    showToast("App data reset");
  }
});

$("notificationBtn").addEventListener("click",async()=>{
  if(!("Notification" in window)){
    alert("This browser does not support notifications.");
    return;
  }
  const permission=await Notification.requestPermission();
  if(permission==="granted"){
    showToast("Reminders enabled");
    checkNotification();
  }else{
    showToast("Notifications were not enabled");
  }
});
function checkNotification(){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const due=state.topics.filter(isDue);
  if(due.length){
    new Notification("VCE PE retrieval practice",{
      body:`You have ${due.length} review${due.length===1?"":"s"} ready today.`,
      icon:"icon.svg"
    });
  }
}
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();deferredInstallPrompt=e;$("installBtn").classList.remove("hidden");
});
$("installBtn").addEventListener("click",async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  $("installBtn").classList.add("hidden");
});
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
}
render();
setTimeout(checkNotification,1200);
