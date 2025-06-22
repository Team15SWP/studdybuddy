document.addEventListener('DOMContentLoaded', () => {
  const messagesBox   = document.getElementById('messages');
  const diffBox       = document.getElementById('difficulty-buttons');
  const quoteBlock    = document.querySelector('.quote');
  const userInput     = document.getElementById('user-input');
  const submitCodeBtn = document.getElementById('submit-code-btn');
  const hintBtn       = document.getElementById('hint-btn');
  const hintHelp      = document.getElementById('hint-help');
  const hintWrapper   = document.querySelector('.hint-wrapper');
  const topicsList    = document.getElementById('topics-list');
  const layoutBox     = document.querySelector('.layout');

  const loginBtn      = document.getElementById('login-btn');
  const loginModal    = document.getElementById('login-modal');
  const modalClose    = document.getElementById('modal-close');
  const userTab       = document.getElementById('user-tab');
  const adminTab      = document.getElementById('admin-tab');
  const loginForm     = document.getElementById('login-form');
  const signupForm    = document.getElementById('signup-form');
  const goSignup      = document.getElementById('go-signup');
  const goLogin       = document.getElementById('go-login');
  const adminForm     = document.getElementById('admin-form');
  const adminAttemptsInfo = document.getElementById('admin-attempts');

  const profileDiv    = document.getElementById('profile');
  const userNameSp    = document.getElementById('user-name');
  const logoutBtn     = document.getElementById('logout-btn');
  const adminBanner   = document.getElementById('admin-banner');

  const uploadBtn     = document.getElementById('upload-syllabus-btn');
  const fileInput     = document.getElementById('syllabus-file');

  let selectedTopic     = null;
  let currentDifficulty = null;
  let isAdmin           = false;
  let syllabusLoaded    = false;
  let adminFails        = parseInt(localStorage.getItem('adminFailedAttempts')||'0',10);

  profileDiv.style.display   = 'none';
  logoutBtn.style.display    = 'none';
  userInput.disabled         = true;
  submitCodeBtn.disabled     = true;
  hintBtn.disabled           = true;
  topicsList.innerHTML       = '';
  topicsList.style.display   = 'none';
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');

  const noTopicsMsg = document.createElement('div');
  noTopicsMsg.textContent = '⏳ Please wait until the administrator uploads the syllabus 😔';
  noTopicsMsg.style.cssText = 'color:#999;text-align:center;margin-top:16px;font-size:14px;';
  topicsList.parentNode.insertBefore(noTopicsMsg, topicsList.nextSibling);

  const hideQuote = () => quoteBlock && (quoteBlock.style.display='none');

  const showMessage = (t,s='bot')=>{
    const d=document.createElement('div');
    d.className=`message ${s}`;
    d.innerHTML=t.replace(/\n/g,'<br>');
    messagesBox.appendChild(d);
    messagesBox.scrollTop=messagesBox.scrollHeight;
  };

  const showCodeMessage = c=>{
    const d=document.createElement('div');
    d.className='message user';
    const p=document.createElement('pre');
    p.textContent=c;
    d.appendChild(p);
    messagesBox.appendChild(d);
    messagesBox.scrollTop=messagesBox.scrollHeight;
  };

  const fetchText=async(u,fb,o={})=>{
    try{
      const r=await fetch(u,o);
      if(!r.ok) return `Error ${r.status}: ${await r.text()}`;
      const ct=r.headers.get('content-type')||'';
      return ct.includes('application/json')?(await r.json()).message||'OK':await r.text();
    }catch(e){return `Network error: ${e.message}`;}
  };

  const updateTopicList=arr=>{
    syllabusLoaded=arr.length>0;
    topicsList.innerHTML='';
    if(!syllabusLoaded){
      topicsList.style.display='none';
      noTopicsMsg.style.display=isAdmin?'none':'block';
      userInput.disabled=true;
      submitCodeBtn.disabled=true;
      hintBtn.disabled=true;
      diffBox.style.display='none';
      selectedTopic=null;
      return;
    }
    topicsList.style.display='block';
    noTopicsMsg.style.display='none';
    userInput.disabled=false;
    submitCodeBtn.disabled=false;
    arr.forEach(t=>{
      const li=document.createElement('li');
      li.textContent=t.trim();
      topicsList.appendChild(li);
      li.addEventListener('click',()=>handleTopic(li));
    });
  };

  const handleTopic=li=>{
    if(!syllabusLoaded) return;
    hideQuote();
    document.querySelectorAll('.sidebar li').forEach(e=>e.classList.remove('active-topic'));
    li.classList.add('active-topic');
    selectedTopic=li.textContent.trim().toLowerCase().replace(/\s+/g,'_');
    hintBtn.disabled=true;
    showMessage(li.textContent,'user');
    showMessage('Select difficulty 👇','bot');
    diffBox.style.display='flex';
  };

  fetch('/get_syllabus')
    .then(r=>r.ok?r.json():null)
    .then(d=>{if(d&&Array.isArray(d.topics))updateTopicList(d.topics);})
    .catch(()=>{});

  const openModal=()=>loginModal.classList.remove('hidden');
  const closeModal=()=>loginModal.classList.add('hidden');
  loginBtn.addEventListener('click',openModal);
  modalClose.addEventListener('click',closeModal);

  userTab.addEventListener('click',()=>{
    userTab.classList.add('active');
    adminTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    adminForm.classList.add('hidden');
  });
  adminTab.addEventListener('click',()=>{
    adminTab.classList.add('active');
    userTab.classList.remove('active');
    adminForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
  });

  goSignup.addEventListener('click',()=>{
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    loginError.textContent='';
  });
  goLogin.addEventListener('click',()=>{
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    loginError.textContent='';
  });

  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const body={ identifier:document.getElementById('li-identifier').value.trim(),
      password:document.getElementById('li-password').value.trim() };
    const res=await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok){
      const { name }=await res.json();
      finishLogin(name,false);
    } else {
      document.getElementById('login-error').textContent='❌ Wrong credentials';
    }
  });

  signupForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const body={ name:document.getElementById('su-name').value.trim(),
      email:document.getElementById('su-email').value.trim(),
      password:document.getElementById('su-password').value.trim() };
    const res=await fetch('/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok) finishLogin(body.name,false);
    else alert(await res.text());
  });

  adminForm.addEventListener('submit',e=>{
    e.preventDefault();
    if(adminFails>=3) return;
    const pwd=document.getElementById('admin-password-input').value.trim();
    if(pwd==='admin123'){
      adminFails=0;
      localStorage.setItem('adminFailedAttempts','0');
      adminAttemptsInfo.textContent='';
      finishLogin('Admin',true);
    } else {
      adminFails+=1;
      localStorage.setItem('adminFailedAttempts',adminFails);
      adminAttemptsInfo.textContent=`Wrong password (${adminFails}/3)`;
      if(adminFails>=3){
        adminAttemptsInfo.textContent='UI locked after 3 failed attempts.';
        adminForm.querySelector('input').disabled=true;
        adminForm.querySelector('button').disabled=true;
      }
    }
  });

  const adjustLayoutHeight=()=>{
    const bh=adminBanner.classList.contains('hidden')?0:adminBanner.offsetHeight;
    layoutBox.style.height=`calc(100vh - 64px - ${bh}px)`;
  };

  const finishLogin=(name,admin)=>{
    isAdmin=admin;
    profileDiv.style.display='flex';
    logoutBtn.style.display='inline-block';
    userNameSp.textContent=name;
    loginBtn.style.display='none';
    adminBanner.classList.toggle('hidden',!admin);
    uploadBtn.style.display=admin?'block':'none';
    if(admin&&!syllabusLoaded) noTopicsMsg.style.display='none';
    closeModal();
    adjustLayoutHeight();
  };

  logoutBtn.addEventListener('click',()=>{
    isAdmin=false;
    profileDiv.style.display='none';
    logoutBtn.style.display='none';
    loginBtn.style.display='inline-block';
    adminBanner.classList.add('hidden');
    uploadBtn.style.display='none';
    if(!syllabusLoaded) noTopicsMsg.style.display='block';
    adjustLayoutHeight();
  });

  uploadBtn.addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',e=>{
    const f=e.target.files[0];
    if(!f)return;
    if(!f.name.endsWith('.txt'))return alert('Only .txt files allowed');
    const reader=new FileReader();
    reader.onload=()=>{
      const lines=reader.result.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      if(!lines.length)return alert('File is empty');
      updateTopicList(lines);
      fetch('/save_syllabus',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topics:lines})}).catch(()=>{});
      alert('Syllabus uploaded ✅');
    };
    reader.readAsText(f);
  });

  if(adminFails>=3){
    adminAttemptsInfo.textContent='UI locked after 3 failed attempts.';
    adminForm.querySelector('input').disabled=true;
    adminForm.querySelector('button').disabled=true;
  }

  userInput.addEventListener('input',()=>{
    userInput.style.height='auto';
    userInput.style.height=userInput.scrollHeight+'px';
  });

  userInput.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){
      e.preventDefault();
      submitCodeBtn.click();
    }
  });

  window.chooseDifficulty=async level=>{
    if(!syllabusLoaded)return;
    hideQuote();
    if(!selectedTopic)return showMessage('❗️ Please select topic first','bot');
    currentDifficulty=level;
    const labels={beginner:'🟢 Beginner',medium:'🟡 Medium',hard:'🔴 Hard'};
    showMessage(labels[level],'user');
    showMessage('Generating task…','bot');
    const task=await fetchText(
      `/generate_task?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(currentDifficulty)}`,
      'Failed to generate task!'
    );
    showMessage(`📝 Task:\n${task}`,'bot');
    hintBtn.disabled=true;
  };

  submitCodeBtn.addEventListener('click',async()=>{
    if(!syllabusLoaded)return;
    if(!selectedTopic)return showMessage('❗️ Please select topic before sending code','bot');
    if(!currentDifficulty)return showMessage('❗️ Please select difficulty before sending code','bot');
    const code=userInput.value.trim();
    if(!code)return;
    hideQuote();
    showCodeMessage(code);
    hintBtn.disabled=false;
    userInput.value='';
    userInput.style.height='auto';
    const resp=await fetchText('/submit_code','Failed to submit code.',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({topic:selectedTopic,difficulty:currentDifficulty,code})
    });
    showMessage(resp,'bot');
  });

  hintBtn.addEventListener('click',async()=>{
    if(!syllabusLoaded)return;
    if(!selectedTopic)return showMessage('❗️ Please select topic first','bot');
    if(!currentDifficulty)return showMessage('❗️ Please select difficulty before sending code','bot');
    showMessage('💡 Hint please! 🥺','user');
    const hint=await fetchText(
      `/get_hint?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(currentDifficulty)}`,
      'Hint is unavailable!'
    );
    showMessage(`💡 Hint: ${hint}`,'bot');
  });

  const showHintTip=m=>{
    const o=hintWrapper.querySelector('.hint-tooltip');
    if(o)o.remove();
    const t=document.createElement('div');
    t.className='hint-tooltip';
    t.textContent=m;
    hintWrapper.appendChild(t);
    setTimeout(()=>t.remove(),3000);
  };

  hintHelp.addEventListener('click',()=>{
    if(hintBtn.disabled)showHintTip('❗️ Send code to get a hint');
  });

  adjustLayoutHeight();
});
