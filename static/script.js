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
    const name = document.getElementById('su-name').value.trim();
    const email = document.getElementById('su-email').value.trim();
    const pwd = document.getElementById('su-password').value.trim();
    if (!name || !email || !pwd) return;
    const res = await fetch('/signup', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, password: pwd })
    });
    if (res.ok) {
      finishLogin(name, false);
    } else {
      alert(await res.text());
    }
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const ident = document.getElementById('li-identifier').value.trim();
    const pwd   = document.getElementById('li-password').value.trim();
    if (!ident || !pwd) return;
    const r = await fetch('/login', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ identifier: ident, password: pwd })
    });
    if (r.ok) {
      const { name } = await r.json();
      finishLogin(name, false);
    } else {
      loginError.textContent = '❌ Wrong credentials';
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
});
