document.addEventListener('DOMContentLoaded', () => {
  const homepage     = document.getElementById('homepage');
  const startChatBtn = document.getElementById('start-chat-btn');
  const topBar       = document.querySelector('.top-bar');
  const layoutBox    = document.querySelector('.layout');
  const adminBanner  = document.getElementById('admin-banner');

  topBar.classList.add('hidden');
  layoutBox.classList.add('hidden');
  adminBanner.classList.add('hidden');

  const showChatUi = () => {
    homepage.classList.add('animate-out');
    homepage.addEventListener('animationend', () => {
      homepage.classList.add('hidden');
      homepage.classList.remove('animate-out');
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

  const loginForm  = document.getElementById('login-form');   // Email + password
  const signupForm = document.getElementById('signup-form');  // Name + email + password
  const goSignup   = document.getElementById('go-signup');    // «Sign up!» link
  const goLogin    = document.getElementById('go-login');     // «Log in!» link
  const loginError = document.getElementById('login-error');  // div для ошибок

  const adminForm  = document.getElementById('admin-form');
  const adminAttemptsInfo = document.getElementById('admin-attempts');

  const profileDiv = document.getElementById('profile');
  const userNameSp = document.getElementById('user-name');
  const logoutBtn  = document.getElementById('logout-btn');

  const uploadBtn  = document.getElementById('upload-syllabus-btn');
  const fileInput  = document.getElementById('syllabus-file');

  let clearBtn = null;

  let selectedTopic = null;
  let currentDifficulty = null;

  let currentTaskRaw    = "";
  let isAdmin = false;
  let syllabusLoaded = false;
  let adminFails = parseInt(localStorage.getItem('adminFailedAttempts') || '0', 10);
  let hintMsg = null;         // <-- ссылка на «Select difficulty 👇»
  const chats = {};        // { topicKey: [outerHTML, …] }
  let currentTopicKey = null;
  let topicMsg = null;
  const lastTasks = {};
  const lastDifficulty = {};
  let diffPromptMsg     = null;
  let currentHints      = [];
  let hintCount         = 0;

  const saveToHistory = html => {
  if (!currentTopicKey) return;              // ещё нет выбранной темы
  if (!chats[currentTopicKey]) chats[currentTopicKey] = [];
  chats[currentTopicKey].push(html);
  };

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

/* ----------------------------------------------------------
   Выводы сообщений и «спиннер ожидания»
---------------------------------------------------------- */
const showMessage = (t, role = 'bot') => {
  const div = document.createElement('div');
  div.className  = `message ${role}`;
  div.textContent = t;
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  // сохраняем в историю открытого чата (кроме подсказки «Select difficulty 👇»)
  if (t !== 'Select difficulty 👇') {
    if (!currentTopicKey) return;
    if (!chats[currentTopicKey]) chats[currentTopicKey] = [];
    chats[currentTopicKey].push(div.outerHTML);
  }
  return div;
};

const makeWaitingNotice = txt => {
  const node = showMessage(txt, 'bot'); // тот же стиль, только курсор-часики
  return () => node.remove();           // вызовите, когда работа закончится
};

const showCodeMessage = code => {
  const div = document.createElement('div');
  div.className = 'message user';
  const pre = document.createElement('pre');
  pre.textContent = code;
  div.appendChild(pre);
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  // тоже в историю
  if (!currentTopicKey) return;
  if (!chats[currentTopicKey]) chats[currentTopicKey] = [];
  chats[currentTopicKey].push(div.outerHTML);
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
      topicsList.style.display = 'none';
      noTopicsMsg.style.display = isAdmin ? 'none' : 'block';
      userInput.disabled = true;
      submitCodeBtn.disabled = true;
      hintBtn.disabled = true;
      diffBox.style.display = 'none';
      selectedTopic = null;
      return;
    }
    topicsList.style.display = 'block';
    noTopicsMsg.style.display = 'none';
    userInput.disabled = false;
    submitCodeBtn.disabled = false;
    arr.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t.trim();
      topicsList.appendChild(li);
      li.addEventListener('click', () => handleTopic(li));
    });
  };
  //Function to clear chat messages
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

  /* 1. Убираем старые служебные сообщения */
  if (hintMsg  && hintMsg.parentNode)  hintMsg.remove();
  if (topicMsg && topicMsg.parentNode) topicMsg.remove();
  hintMsg  = null;
  topicMsg = null;

  /* 2. Сохраняем историю предыдущего чата */
  if (currentTopicKey !== null) {
    chats[currentTopicKey] = Array.from(messagesBox.children, el => el.outerHTML);
  }

  /* 3. Определяем ключ темы и восстанавливаем её историю */
  selectedTopic   = li.textContent.trim();                          // «Arrays and Strings»
  currentTopicKey = selectedTopic.toLowerCase().replace(/\s+/g,'_'); // arrays_and_strings
  currentDifficulty = lastDifficulty[currentTopicKey] ?? null;

  messagesBox.innerHTML = '';
  if (chats[currentTopicKey]) {
    messagesBox.innerHTML = chats[currentTopicKey].join('');
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  /* 4. Подсветка в сайдбаре */
  document.querySelectorAll('.sidebar li').forEach(e => e.classList.remove('active-topic'));
  li.classList.add('active-topic');

  /* 5. UI-состояние */
  const hasTask = Boolean(lastTasks[currentTopicKey]);
  if (!hasTask) {
    hintBtn.disabled = true;
    topicMsg = showMessage(selectedTopic, 'user');
    hintMsg  = showMessage('Select difficulty 👇', 'bot');
  } else {
    hintBtn.disabled = false;
  }
  diffBox.style.display   = 'flex';
  submitCodeBtn.disabled  = !hasTask;
};


  fetch('/get_syllabus')
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      if (d && Array.isArray(d.topics)) updateTopicList(d.topics);
    })
    .catch(() => {});
  
  const clearSyllabus = () => {
    updateTopicList([]);
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

signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pwd   = document.getElementById('su-password').value.trim();
  if (!name || !email || !pwd) return;

  try {
    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: name, email, password: pwd })
    });

    if (!res.ok) {
      const err = await res.json();
      loginError.textContent = err.detail || 'Registration failed';
      return;
    }

    const data = await res.json();
    finishLogin(data.name, false);  // логиним после успешной регистрации
  } catch (err) {
    loginError.textContent = `Error: ${err.message}`;
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
    uploadBtn.style.display  = admin ? 'block' : 'none';

    if (admin) {
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

  // 5) Обновляем интерфейс и шлём на сервер
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
    return showMessage('❗️ First, choose a theme', 'bot');
  }

  const requestKey = currentTopicKey;          // фиксируем чат, из которого пришёл запрос
  currentDifficulty           = level;
  lastDifficulty[requestKey]  = level;

  if (hintMsg) { hintMsg.remove(); hintMsg = null; }

  const labels = { beginner:'🟢 Beginner', medium:'🟡 Medium', hard:'🔴 Hard' };
  showMessage(labels[level], 'user');

  const stop = makeWaitingNotice('⏳ Generating your exercise, please wait…');

  try {
    const res  = await fetch(`/generate_task?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(level)}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || res.statusText);

    /* кешируем */
    lastTasks[requestKey] = json.task;
    if (currentTopicKey === requestKey) currentTaskRaw = json.task;

    /* разбираем задачу и подсказки */
    const t = JSON.parse(json.task);

    currentHints = (t.Hints && typeof t.Hints === 'object')
      ? [t.Hints.Hint1, t.Hints.Hint2, t.Hints.Hint3].filter(Boolean)
      : [];
    hintCount = 0;

    /* вывод */
    let out = `📝 *${t['Task name']}*\n\n`;
    out    += `${t['Task description']}\n\n`;
    out    += '🧪 Sample cases:\n';
    t['Sample input cases'].forEach(({ input, expected_output }) => {
      out += `• Input: ${input} → Expected: ${expected_output}\n`;
    });

    pushToChat(out, 'bot', requestKey);
  } catch (err) {
    pushToChat(`Ошибка: ${err.message}`, 'bot', requestKey);
  } finally {
    stop();
  }

  hintBtn.disabled = true;   // разблокируем после первой отправки решения
};



 submitCodeBtn.addEventListener('click', async () => {
  if (!syllabusLoaded) return;

  if (!selectedTopic)
    return showMessage('❗️ Please select topic before sending code', 'bot');

  // задача должна быть в кэше; иначе пользователь ещё не выбрал уровень
  const taskRaw = lastTasks[currentTopicKey];
  if (!taskRaw) {
    return showMessage('❗️ Сначала получите задачу (выберите сложность)', 'bot');
  }

  // уровень берём из кэша; он нам нужен для POST-запроса
  currentDifficulty = lastDifficulty[currentTopicKey];
  const code = userInput.value.trim();
  if (!code) return;

  hideQuote();
  // showCodeMessage(code);
  const requestKey = currentTopicKey;   // фиксируем, откуда ушёл запрос
 pushUserCode(code, requestKey);       // кладём код именно туда
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
        task:   taskRaw,
        code
      })
    });

    // showMessage(respText, 'bot');
    pushToChat(respText, 'bot', requestKey);
    if (currentTopicKey === requestKey) hintBtn.disabled = false;
  } catch (e) {
    // showMessage(`Error: ${e.message}`, 'bot');
    pushToChat(`Error: ${e.message}`, 'bot', requestKey);
  } finally {
    stopNotice();              // ✅ remove notice whatever happens
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

  /* ------------------------------------------------------------------
   Добавляет сообщение в историю указанного топика
   и рисует его в DOM, *только если* этот топик открыт.
------------------------------------------------------------------ */
const pushToChat = (text, role, topicKey) => {
  // 1) гарантируем массив истории
  if (!chats[topicKey]) chats[topicKey] = [];

  // 2) готовим DOM-элемент
  const div = document.createElement('div');
  div.className  = `message ${role}`;
  div.textContent = text;

  // 3) сохраняем HTML в историю
  chats[topicKey].push(div.outerHTML);

  // 4) выводим только в действующий чат
  if (topicKey === currentTopicKey) {
    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }
};

const pushUserCode = (code, topicKey) => {
  const div = document.createElement('div');
  div.className = 'message user';
  const pre = document.createElement('pre');
  pre.textContent = code;
  div.appendChild(pre);

  // сохраняем
  if (!chats[topicKey]) chats[topicKey] = [];
  chats[topicKey].push(div.outerHTML);

  if (topicKey === currentTopicKey) {
    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }
};
});

