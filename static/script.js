document.addEventListener('DOMContentLoaded', () => {
  const messagesBox = document.getElementById('messages');
  const diffBox = document.getElementById('difficulty-buttons');
  const quoteBlock = document.querySelector('.quote');
  const userInput = document.getElementById('user-input');
  const submitCodeBtn = document.getElementById('submit-code-btn');
  const hintBtn = document.getElementById('hint-btn');
  const hintHelp = document.getElementById('hint-help');
  const hintWrapper = document.querySelector('.hint-wrapper');
  const topicsList = document.getElementById('topics-list');
  const layoutBox = document.querySelector('.layout');

  const loginBtn = document.getElementById('login-btn');
  const loginModal = document.getElementById('login-modal');
  const modalClose = document.getElementById('modal-close');
  const userTab = document.getElementById('user-tab');
  const adminTab = document.getElementById('admin-tab');
  const userForm = document.getElementById('user-form');
  const adminForm = document.getElementById('admin-form');
  const adminAttemptsInfo = document.getElementById('admin-attempts');

  const profileDiv = document.getElementById('profile');
  const userNameSp = document.getElementById('user-name');
  const logoutBtn = document.getElementById('logout-btn');
  const adminBanner = document.getElementById('admin-banner');

  const uploadBtn = document.getElementById('upload-syllabus-btn');
  const fileInput = document.getElementById('syllabus-file');

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

  const saveToHistory = html => {
  if (!currentTopicKey) return;              // ещё нет выбранной темы
  if (!chats[currentTopicKey]) chats[currentTopicKey] = [];
  chats[currentTopicKey].push(html);
  };

  profileDiv.style.display = 'none';
  logoutBtn.style.display = 'none';
  userInput.disabled = true;
  submitCodeBtn.disabled = true;
  hintBtn.disabled = true;
  topicsList.innerHTML = '';
  topicsList.style.display = 'none';
  const noTopicsMsg = document.createElement('div');
  noTopicsMsg.textContent = '⏳ Please wait until the administrator uploads the syllabus 😔';
  noTopicsMsg.style.cssText = 'color:#999;text-align:center;margin-top:16px;font-size:14px;';
  topicsList.parentNode.insertBefore(noTopicsMsg, topicsList.nextSibling);

  const hideQuote = () => quoteBlock && (quoteBlock.style.display = 'none');

  const showMessage = (t, s = 'bot') => {
  const d = document.createElement('div');
  d.className = `message ${s}`;
  d.textContent = t;
  messagesBox.appendChild(d);
  messagesBox.scrollTop = messagesBox.scrollHeight;

   if (t !== 'Select difficulty 👇') {
    saveToHistory(d.outerHTML);
  }               // ← добавлено
  return d;
};

  const makeWaitingNotice = txt => {
  const node = showMessage(txt, 'bot'); // same styling as other bot msgs
  return () => node.remove();           // call this when work is done
};

  const showCodeMessage = c => {
  const d = document.createElement('div');
  d.className = 'message user';
  const p = document.createElement('pre');
  p.textContent = c;
  d.appendChild(p);
  messagesBox.appendChild(d);
  messagesBox.scrollTop = messagesBox.scrollHeight;

  saveToHistory(d.outerHTML);               // ← добавлено
};

  const fetchEval = async (url, opts = {}) => {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(await r.text());

  const data = await r.json();   // { correct, feedback } или { message }

  // Если есть message → сразу отдаём
  if ('message' in data) return data.message;

  // Иначе собираем текст из correct / feedback
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

  const handleTopic = li => {
  if (!syllabusLoaded) return;
  hideQuote();

  /* 1) убираем старую подсказку, чтобы не попасть в history */
 if (hintMsg && hintMsg.parentNode) {
    hintMsg.remove();
    hintMsg = null;
  }
 if (topicMsg && topicMsg.parentNode) {
      topicMsg.remove();
      topicMsg = null;
 }

  /* 2) сохраняем историю старого топика */
  if (currentTopicKey !== null) {
    chats[currentTopicKey] = Array.from(
      messagesBox.children,
      el => el.outerHTML
    );
  }

  /* 2) вычисляем два представления темы */
  selectedTopic   = li.textContent.trim();                     // для сервера
  currentTopicKey = selectedTopic.toLowerCase().replace(/\s+/g, '_'); // для chats

    currentDifficulty = lastDifficulty[currentTopicKey] ?? null;
    currentTaskRaw    = lastTasks[currentTopicKey]    ?? '';

  /* 4) восстанавливаем (или очищаем) чат */
  messagesBox.innerHTML = '';
  if (chats[currentTopicKey]) {
    messagesBox.innerHTML = chats[currentTopicKey].join('');
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  /* 5) подчёркиваем выбранную тему в сайдбаре */
  document.querySelectorAll('.sidebar li')
           .forEach(e => e.classList.remove('active-topic'));
  li.classList.add('active-topic');

   if (!lastTasks[currentTopicKey]) {
  // уровень ещё НЕ выбран — обычное поведение
  hintBtn.disabled = true;

  topicMsg = showMessage(selectedTopic, 'user');
  hintMsg  = showMessage('Select difficulty 👇', 'bot');
  diffBox.style.display = 'flex';
} else {
  // уровень УЖЕ был выбран — лишний UI скрываем
  diffBox.style.display = 'flex';
  hintBtn.disabled = false;
}
//    // --- Синхронизация UI после выбора темы ---
// const hasTask = Boolean(lastTasks[currentTopicKey]);
//
// submitCodeBtn.disabled = !hasTask;      // можно отправлять код, только если задача уже есть
// hintBtn.disabled       = !hasTask;      // подсказки тоже доступны
// diffBox.style.display  = hasTask ? 'none' : 'flex'; // повторно уровень не спрашиваем


};

  fetch('/get_syllabus')
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      if (d && Array.isArray(d.topics)) updateTopicList(d.topics);
    })
    .catch(() => {});

  const openModal = () => loginModal.classList.remove('hidden');
  const closeModal = () => loginModal.classList.add('hidden');
  loginBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);

  userTab.addEventListener('click', () => {
    userTab.classList.add('active');
    adminTab.classList.remove('active');
    userForm.classList.remove('hidden');
    adminForm.classList.add('hidden');
  });
  adminTab.addEventListener('click', () => {
    adminTab.classList.add('active');
    userTab.classList.remove('active');
    adminForm.classList.remove('hidden');
    userForm.classList.add('hidden');
  });

  userForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('user-name-input').value.trim();
    const mail = document.getElementById('user-email-input').value.trim();
    const pwd = document.getElementById('user-password-input').value.trim();
    if (!name || !mail || !pwd) return;
    finishLogin(name, false);
  });

  adminForm.addEventListener('submit', e => {
    e.preventDefault();
    if (adminFails >= 3) return;
    const pwd = document.getElementById('admin-password-input').value.trim();
    if (pwd === 'admin123') {
      adminFails = 0;
      localStorage.setItem('adminFailedAttempts', '0');
      adminAttemptsInfo.textContent = '';
      finishLogin('Admin', true);
    } else {
      adminFails += 1;
      localStorage.setItem('adminFailedAttempts', adminFails);
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
    logoutBtn.style.display = 'inline-block';
    userNameSp.textContent = name;
    loginBtn.style.display = 'none';
    adminBanner.classList.toggle('hidden', !admin);
    uploadBtn.style.display = admin ? 'block' : 'none';
    if (admin && !syllabusLoaded) noTopicsMsg.style.display = 'none';
    closeModal();
    adjustLayoutHeight();
  };

  logoutBtn.addEventListener('click', () => {
    isAdmin = false;
    profileDiv.style.display = 'none';
    logoutBtn.style.display = 'none';
    loginBtn.style.display = 'inline-block';
    adminBanner.classList.add('hidden');
    uploadBtn.style.display = 'none';
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

  // Вызывается при клике по кнопке уровня сложности
window.chooseDifficulty = async level => {
  // 1. Проверки
  if (!syllabusLoaded) return;
  hideQuote();

  if (!selectedTopic) {
    return showMessage('❗️ First, choose a theme', 'bot');
  }

  // 2. Запоминаем, в каком чате сделали запрос
  const requestKey = currentTopicKey;

  // 3. Сохраняем выбранную сложность
  currentDifficulty = level;
  lastDifficulty[currentTopicKey] = level;

  // 4. Убираем старую подсказку «Select difficulty 👇», если была
  if (hintMsg) {
    hintMsg.remove();
    hintMsg = null;
  }

  // 5. Сообщаем пользователю о выбранном уровне
  const labels = {
    beginner: '🟢 Beginner',
    medium:   '🟡 Medium',
    hard:     '🔴 Hard'
  };
  showMessage(labels[level], 'user');

  // 6. Показываем «спиннер» ожидания и получаем функцию-очистку
  const stopNotice = makeWaitingNotice('⏳ Generate task, wait…');

  try {
    // 7. Запрашиваем задачу с сервера
    const res = await fetch(
      `/generate_task?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(level)}`
    );
    const json = await res.json();
    if (currentTopicKey === requestKey) currentTaskRaw = json.task;
   lastTasks[requestKey] = json.task;


    if (!res.ok) throw new Error(json.error || res.statusText);

    // 8. Форматируем полученную задачу для вывода
    const t = JSON.parse(json.task);
    let out = `📝 *${t['Task name']}*\n\n`;
    out += `${t['Task description']}\n\n`;
    out += '🧪 Sample cases:\n';
    t['Sample input cases'].forEach(({ input, expected_output }) => {
      out += `• Ввод: ${input} → Ожидается: ${expected_output}\n`;
    });

    // 9. Отправляем сообщение в тот же чат, откуда пришёл запрос
    pushToChat(out, 'bot', requestKey);
  } catch (err) {
    pushToChat(`Ошибка: ${err.message}`, 'bot', requestKey);
  } finally {
    // 10. Убираем индикатор ожидания
    stopNotice();
  }

  // 11. До первой отправки решения подсказки недоступны
  hintBtn.disabled = true;
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
+ pushUserCode(code, requestKey);       // кладём код именно туда
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


  hintBtn.addEventListener('click', async () => {
    if (!syllabusLoaded) return;
    if (!selectedTopic) return showMessage('❗️ Please select topic first', 'bot');
    if (!currentDifficulty) return showMessage('❗️ Please select difficulty first', 'bot');
    showMessage('💡 Hint please! 🥺', 'user');
    const hint = await fetchText(
      `/get_hint?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(currentDifficulty)}`,
      'Hint is unavailable!'
    );
    showMessage(`💡 Hint: ${hint}`, 'bot');
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
