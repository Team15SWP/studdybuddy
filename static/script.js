if (sessionStorage.getItem('pp_uiStarted')) {
  document.documentElement.classList.add('pp-skip-home'); 
}

document.addEventListener('DOMContentLoaded', () => {
  const homepage     = document.getElementById('homepage');
  const startChatBtn = document.getElementById('start-chat-btn');
  const topBar       = document.querySelector('.top-bar');
  const layoutBox    = document.querySelector('.layout');
  const adminBanner  = document.getElementById('admin-banner');
  const suError = document.getElementById('su-error');

  topBar.classList.add('hidden');
  layoutBox.classList.add('hidden');
  adminBanner.classList.add('hidden');

  const showChatUi = () => {
    homepage.classList.add('animate-out');
    homepage.addEventListener('animationend', () => {
      homepage.classList.add('hidden');
      homepage.classList.remove('animate-out');
      sessionStorage.setItem('pp_uiStarted', '1');
      topBar.classList.remove('hidden');
      topBar.classList.add('animate-in');
      layoutBox.classList.remove('hidden');
      layoutBox.classList.add('animate-in');
      if (!adminBanner.classList.contains('hidden'))
        adminBanner.classList.add('animate-in');
      [topBar, layoutBox, adminBanner].forEach(el =>
        el.addEventListener('animationend', () => el.classList.remove('animate-in'), { once: true })
      );
    }, { once: true });
  };
  if (startChatBtn) startChatBtn.addEventListener('click', showChatUi);

  const messagesBox = document.getElementById('messages');
  const diffBox = document.getElementById('difficulty-buttons');
  const quoteBlock = document.querySelector('.quote');
  const userInput = document.getElementById('user-input');
  const submitCodeBtn = document.getElementById('submit-code-btn');
  const hintBtn = document.getElementById('hint-btn');
  const hintHelp = document.getElementById('hint-help');
  const hintWrapper = document.querySelector('.hint-wrapper');
  const topicsList = document.getElementById('topics-list');

  const loginBtn   = document.getElementById('login-btn');
  const loginModal = document.getElementById('login-modal');
  const modalClose = document.getElementById('modal-close');
  const userTab    = document.getElementById('user-tab');
  const adminTab   = document.getElementById('admin-tab');

  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const goSignup   = document.getElementById('go-signup');
  const goLogin    = document.getElementById('go-login');
  const loginError = document.getElementById('login-error');

  const adminForm  = document.getElementById('admin-form');
  const adminAttemptsInfo = document.getElementById('admin-attempts');

  const profileDiv = document.getElementById('profile');
  const userNameSp = document.getElementById('user-name');
  const logoutBtn  = document.getElementById('logout-btn');

  const uploadBtn  = document.getElementById('upload-syllabus-btn');
  const fileInput  = document.getElementById('syllabus-file');

  const scoreBtn    = document.getElementById('score-btn');
  const scoreCntSp  = document.getElementById('score-count');
  const scoreModal  = document.getElementById('score-modal');
  const scoreClose  = document.getElementById('score-close');
  const scoreText   = document.getElementById('score-text');

  let solvedCount = 0;

  const scoreKey = () => 'pp_solved_' + (userNameSp.textContent || 'anon');

  const loadScore = () => {
    solvedCount = parseInt(localStorage.getItem(scoreKey()) || '0', 10);
    updateScoreDisplay();
  };
  const saveScore = () => localStorage.setItem(scoreKey(), solvedCount);

  const updateScoreDisplay = () => {
    scoreCntSp.textContent = solvedCount;
    scoreText.textContent  =
      `You have solved ${solvedCount} task${solvedCount === 1 ? '' : 's'} 🎉`;
  };

  scoreBtn.addEventListener('click', () => {
    updateScoreDisplay();
    scoreModal.classList.remove('hidden');
  });
  scoreClose.addEventListener('click',
    () => scoreModal.classList.add('hidden'));

  let clearBtn = null;

  let selectedTopic = null;
  let currentDifficulty = null;
  let currentTaskRaw    = '';
  let isAdmin           = false;
  let syllabusLoaded    = false;
  let adminFails        = parseInt(localStorage.getItem('adminFailedAttempts') || '0', 10);
  let diffPromptMsg     = null;
  let currentHints      = [];
  let hintCount         = 0;

  profileDiv.style.display = 'none';
  logoutBtn.style.display  = 'none';
  userInput.disabled       = true;
  submitCodeBtn.disabled   = true;
  hintBtn.disabled         = true;
  topicsList.innerHTML     = '';
  topicsList.style.display = 'none';

  const noTopicsMsg = document.createElement('div');
  noTopicsMsg.textContent = '⏳ Please wait until the administrator uploads the syllabus 😔';
  noTopicsMsg.style.cssText = 'color:#999;text-align:center;margin-top:16px;font-size:14px;';
  topicsList.parentNode.insertBefore(noTopicsMsg, topicsList.nextSibling);

  const hideQuote = () => quoteBlock && (quoteBlock.style.display = 'none');

  const showMessage = (t, s='bot') => {
    const d = document.createElement('div');
    d.className = `message ${s}`;
    d.textContent = t;
    messagesBox.appendChild(d);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return d;
  };
  const makeWaitingNotice = txt => {
    const node = showMessage(txt, 'bot');
    return () => node.remove();
  };
  const showCodeMessage = code => {
    const d = document.createElement('div');
    d.className = 'message user';
    const p = document.createElement('pre');
    p.textContent = code;
    d.appendChild(p);
    messagesBox.appendChild(d);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  };

  const fetchEval = async (url, opts={}) => {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    if ('message' in data) return data.message;
    return `${data.correct ? '✅ Correct solution!' : '❌ Wrong solution.'}`
      + (data.feedback ? `\n\n${data.feedback}` : '');
  };

  const updateTopicList = arr => {
    syllabusLoaded = arr.length > 0;
    topicsList.innerHTML = '';

    if (!syllabusLoaded) {
      topicsList.style.display  = 'none';
      noTopicsMsg.style.display = isAdmin ? 'none' : 'block';
      userInput.disabled        = true;
      submitCodeBtn.disabled    = true;
      selectedTopic             = null;

      if (isAdmin) {
        uploadBtn.style.display  = 'block';
        if (clearBtn) clearBtn.style.display = 'none';
      }
      return;
    }

    topicsList.style.display  = 'block';
    noTopicsMsg.style.display = 'none';
    userInput.disabled        = false;
    submitCodeBtn.disabled    = false;
    diffBox.style.display      = 'flex';

    arr.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t.trim();
      topicsList.appendChild(li);
      li.addEventListener('click', () => handleTopic(li));
    });

    if (isAdmin) {
      if (!clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.id          = 'clear-syllabus-btn';
        clearBtn.className   = 'upload-btn';
        clearBtn.textContent = 'Clear syllabus';
        clearBtn.style.marginTop = '6px';
        clearBtn.addEventListener('click', clearSyllabus);
        uploadBtn.parentNode.insertBefore(clearBtn, uploadBtn.nextSibling);
      }
      clearBtn.style.display  = 'block';
      uploadBtn.style.display = 'none';
    }
  };
  function clearChat() {
    messagesBox.innerHTML = '';
    taskShown = false;
    answerSent = false;
    hintBtn.disabled = true;
    if (quoteBlock) quoteBlock.style.display = 'none';
  }

  const handleTopic = li => {
    if (!syllabusLoaded) return;
    hideQuote();
    document.querySelectorAll('.sidebar li').forEach(e => e.classList.remove('active-topic'));
    li.classList.add('active-topic');
    selectedTopic = li.textContent.trim().toLowerCase().replace(/\s+/g, '_');
    hintBtn.disabled = true;
    clearChat();
    showMessage(li.textContent, 'user');
    diffPromptMsg = showMessage('Select difficulty 👇', 'bot'); // запоминаем div
    diffBox.style.display = 'flex';
  };

  fetch('/get_syllabus')
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      if (d && Array.isArray(d.topics)) updateTopicList(d.topics);
    })
    .catch(() => {});

  const clearSyllabus = () => {
    updateTopicList([]);
    diffBox.style.display = 'flex';

    fileInput.value = '';

    fetch('/clear_syllabus', { method: 'DELETE' }).catch(()=>{});

    alert('Syllabus cleared');
  };

  const openModal  = () => loginModal.classList.remove('hidden');
  const closeModal = () => loginModal.classList.add('hidden');
  loginBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);

  userTab.addEventListener('click', () => {
    userTab.classList.add('active'); adminTab.classList.remove('active');
    loginForm.classList.remove('hidden'); signupForm.classList.add('hidden'); adminForm.classList.add('hidden');
  });
  adminTab.addEventListener('click', () => {
    adminTab.classList.add('active'); userTab.classList.remove('active');
    adminForm.classList.remove('hidden'); loginForm.classList.add('hidden'); signupForm.classList.add('hidden');
  });
  goSignup.addEventListener('click', () => {
    loginForm.classList.add('hidden'); signupForm.classList.remove('hidden');
    loginError.textContent = '';
  });
  goLogin.addEventListener('click', () => {
    signupForm.classList.add('hidden'); loginForm.classList.remove('hidden');
    loginError.textContent = '';
  });
  const validateSignup = (name, email, pwd) => {
    const reName  = /^[a-zA-Z][a-zA-Z0-9_]{2,15}$/;
    const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!reName.test(name))  return 'Nickname must be 3-16 latin letters/digits';
    if (!reEmail.test(email)) return 'Invalid e-mail format';
    if (pwd.length < 9)      return 'Password must be ≥ 9 chars';
    if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/\d/.test(pwd))
      return 'Password needs upper, lower & digit';
    return '';
  };

  const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', ''];
  const isLocal         = LOCAL_HOSTNAMES.includes(location.hostname);
  const getUsers        = () => JSON.parse(localStorage.getItem('pp_users') || '[]');
  const saveUsers       = users => localStorage.setItem('pp_users', JSON.stringify(users));
  const errorBox        = suError || loginError;
  const showSuErr       = msg => { if (errorBox) errorBox.textContent = msg; };

  signupForm.addEventListener('submit', async e => {
    e.preventDefault();

    const name  = document.getElementById('su-name').value.trim();
    const email = document.getElementById('su-email').value.trim();
    const pwd   = document.getElementById('su-password').value.trim();

    const err = validateSignup(name, email, pwd);
    if (err) { showSuErr(err); return; }
    showSuErr('');

    if (isLocal) {
      const users = getUsers();
      if (users.some(u => u.email === email || u.name === name)) {
        showSuErr('User with this e-mail or nickname already exists');
        return;
      }
      users.push({ name, email, pwd });
      saveUsers(users);
      finishLogin(name, false);
      closeModal();
      return;
    }

    try {
      const res = await fetch('/signup', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ login: name, email, password: pwd })
      });

      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        showSuErr(data.detail || `Server error (${res.status})`);
        return;
      }

      const data = await res.json();
      finishLogin(data.name || name, false);
      closeModal();
    } catch (e2) {
      showSuErr(`Network error: ${e2.message}`);
    }
  });


  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const ident = document.getElementById('li-identifier').value.trim();
    const pwd   = document.getElementById('li-password').value.trim();
    if (!ident || !pwd) return;

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: ident, password: pwd })
      });

      if (!res.ok) {
        const err = await res.json();
        loginError.textContent = err.detail || 'Login failed';
        return;
      }

      const data = await res.json();
      finishLogin(data.name, false);
    } catch (err) {
      loginError.textContent = `Error: ${err.message}`;
    }
  });


  adminForm.addEventListener('submit', e => {
    e.preventDefault();
    if (adminFails >= 3) return;
    const pwd = document.getElementById('admin-password-input').value.trim();
    if (pwd === 'admin123') {
      adminFails = 0; localStorage.setItem('adminFailedAttempts','0');
      adminAttemptsInfo.textContent = '';
      finishLogin('Admin', true);
    } else {
      adminFails += 1; localStorage.setItem('adminFailedAttempts', adminFails);
      adminAttemptsInfo.textContent = `Wrong password (${adminFails}/3)`;
      if (adminFails >= 3) {
        adminAttemptsInfo.textContent = 'UI locked after 3 failed attempts.';
        adminForm.querySelector('input').disabled = true;
        adminForm.querySelector('button').disabled = true;
      }
    }
  });

  const adjustLayoutHeight = () => {
    const bannerHeight = adminBanner.classList.contains('hidden') ? 0 : adminBanner.offsetHeight;
    layoutBox.style.height = `calc(100vh - 64px - ${bannerHeight}px)`;
  };

  const finishLogin = (name, admin) => {
    isAdmin = admin;
    profileDiv.style.display = 'flex';
    logoutBtn.style.display  = 'inline-block';
    userNameSp.textContent   = name;
    loginBtn.style.display   = 'none';
    adminBanner.classList.toggle('hidden', !admin);

    if (admin && !syllabusLoaded) {
      uploadBtn.style.display = 'block';
    } else {
      uploadBtn.style.display = 'none';
    }

    if (clearBtn) clearBtn.style.display = 'none';



    if (admin && syllabusLoaded) {
      if (!clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.id = 'clear-syllabus-btn';
        clearBtn.className = 'upload-btn';
        clearBtn.textContent = 'Clear syllabus';
        clearBtn.style.marginTop = '6px';
        clearBtn.addEventListener('click', clearSyllabus);
        uploadBtn.parentNode.insertBefore(clearBtn, uploadBtn.nextSibling);
      }
      clearBtn.style.display = 'block';
    } else if (clearBtn) {
      clearBtn.style.display = 'none';
    }

    if (admin && !syllabusLoaded) noTopicsMsg.style.display = 'none';
    scoreBtn.classList.remove('hidden');
    loadScore()
    closeModal();
    adjustLayoutHeight();
  };

  logoutBtn.addEventListener('click', () => {
    isAdmin = false;
    profileDiv.style.display = 'none';
    logoutBtn.style.display  = 'none';
    loginBtn.style.display   = 'inline-block';
    adminBanner.classList.add('hidden');
    uploadBtn.style.display  = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    if (!syllabusLoaded) noTopicsMsg.style.display = 'block';
    adjustLayoutHeight();
    scoreBtn.classList.add('hidden');
  });

  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.setAttribute('accept', '.txt,application/pdf');

  fileInput.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;

    const name = f.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.pdf')) {
      return alert('Only .txt and .pdf files allowed');
    }

    let text;
    if (name.endsWith('.txt')) {
      text = await new Promise(res => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsText(f);
      });
    } else {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let full = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        full += content.items.map(it => it.str).join(' ') + '\n';
      }
      text = full;
    }

    const idx = text.search(/Tentative Course Schedule:/i);
    const scheduleText = idx >= 0 ? text.slice(idx) : text;

    const endIdx = scheduleText.search(/Means of Evaluation:/i);
    const scheduleBlock = endIdx >= 0
      ? scheduleText.slice(0, endIdx)
      : scheduleText;

    const re = /Week\s*\d+\s+(.+?)(?=Week\s*\d+\s+|$)/gis;
    const topics = [];
    let m;
    while ((m = re.exec(scheduleBlock)) !== null) {
      topics.push(m[1].trim());
    }


    if (topics.length === 0) {
      console.log('Parsed chunk:', scheduleText);
      return alert('No course topics found in the uploaded file.');
    }
    
    updateTopicList(topics);
    fetch('/save_syllabus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topics })
    }).catch(() => {});
    alert('Syllabus uploaded ✅');
  });


  if (adminFails >= 3) {
    adminAttemptsInfo.textContent = 'UI locked after 3 failed attempts.';
    adminForm.querySelector('input').disabled = true;
    adminForm.querySelector('button').disabled = true;
  }

  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
  });

  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitCodeBtn.click();
    }
  });

  window.chooseDifficulty = async level => {
    if (!syllabusLoaded) return;
    hideQuote();
    if (!selectedTopic) {
      return showMessage('❗️ Please select topic first', 'bot');
    }
    currentDifficulty = level;

    if (diffPromptMsg) {
      diffPromptMsg.remove();
      diffPromptMsg = null;
    }

    const labels = { beginner: '🟢 Beginner', medium: '🟡 Medium', hard: '🔴 Hard' };
    showMessage(labels[level], 'user');
    const stopNotice = makeWaitingNotice('⏳ Generating your exercise, please wait…');

    try {
      const res = await fetch(
        `/generate_task?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(level)}`
      );
      const json = await res.json();
      console.log("Raw JSON response from backend:", json);
      currentTaskRaw = json.task;

      if (!res.ok) {
        throw new Error(json.error || res.statusText);
      }

      const taskObj = JSON.parse(json.task);

      
      if (taskObj.Hints && typeof taskObj.Hints === 'object') {
        currentHints = [
          taskObj.Hints.Hint1 || '',
          taskObj.Hints.Hint2 || '',
          taskObj.Hints.Hint3 || ''
        ].filter(hint => hint.trim() !== '');
      } else {
        currentHints = [];
      }

      hintCount = 0;

      let out = `📝 *${taskObj["Task name"]}*\n\n`;
      out += `${taskObj["Task description"]}\n\n`;
      out += `🧪 Sample cases:\n`;
      taskObj["Sample input cases"].forEach(({ input, expected_output }) => {
        out += `• Input: ${input} → Expected: ${expected_output}\n`;
      });

      showMessage(out, 'bot');
      console.log('Parsed hints:', currentHints);
    } catch (err) {
      showMessage(`Error: ${err.message}`, 'bot');
    } finally {
      stopNotice();
    }
    hintBtn.disabled = true;
  };


  submitCodeBtn.addEventListener('click', async () => {
    if (!syllabusLoaded) return;
    if (!selectedTopic)
      return showMessage('❗️ Please select topic before sending code', 'bot');
    if (!currentDifficulty)
      return showMessage('❗️ Please select difficulty before sending code', 'bot');

    const code = userInput.value.trim();
    if (!code) return;

    hideQuote();
    showCodeMessage(code);        
    hintBtn.disabled = false;

    const stopNotice = makeWaitingNotice('⏳ Checking your solution…');


    userInput.value = '';
    userInput.style.height = 'auto';

    try {
      const respText = await fetchEval('/submit_code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          difficulty: currentDifficulty,
          task:   currentTaskRaw,
          code
        })
      });

      showMessage(respText, 'bot');
      if (respText.startsWith('✅')) {
        solvedCount += 1;
        saveScore();
        updateScoreDisplay();
      }
    } catch (e) {
      showMessage(`Error: ${e.message}`, 'bot');
    } finally {
      stopNotice();              
    }
  });


  hintBtn.addEventListener('click', () => {
    if (!syllabusLoaded) return;
    if (!selectedTopic) return showMessage('❗️ Please select topic first', 'bot');
    if (!currentDifficulty) return showMessage('❗️ Please select difficulty first', 'bot');
    if (!currentHints.length) return showMessage('❗️ No hints available for this task.', 'bot');
    if (hintCount >= 3) {
      showMessage("You’ve used all your hints for this submission. Try improving your code or ask for feedback.", 'bot');
      return;
    }
    showMessage('💡 Hint please! 🥺', 'user');
    showMessage(`💡 Hint: ${currentHints[hintCount]}`, 'bot');
    hintCount++;
  });

  const showHintTip = m => {
    const o = hintWrapper.querySelector('.hint-tooltip');
    if (o) o.remove();
    const t = document.createElement('div');
    t.className = 'hint-tooltip';
    t.textContent = m;
    hintWrapper.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };

  hintHelp.addEventListener('click', () => {
    if (hintBtn.disabled) showHintTip('❗️ Send code to get a hint');
  });

  adjustLayoutHeight();
});
