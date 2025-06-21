document.addEventListener('DOMContentLoaded', () => {
  const messagesBox   = document.getElementById('messages');
  const diffBox       = document.getElementById('difficulty-buttons');
  const quoteBlock    = document.querySelector('.quote');
  const userInput     = document.getElementById('user-input');
  const submitCodeBtn = document.getElementById('submit-code-btn');
  const hintBtn       = document.getElementById('hint-btn');
  const hintHelp      = document.getElementById('hint-help');
  const hintWrapper   = document.querySelector('.hint-wrapper');

  let selectedTopic     = null;
  let currentDifficulty = null;
  let taskShown         = false;
  let answerSent        = false;
  let currentTaskText   = '';

  function hideQuote() {
    if (quoteBlock) quoteBlock.style.display = 'none';
  }

  function showMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    msg.textContent = text;
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function showCodeMessage(code) {
    const msg = document.createElement('div');
    msg.className = 'message user';

    const pre = document.createElement('pre');
    pre.textContent = code;

    msg.appendChild(pre);
    messagesBox.appendChild(msg);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  async function fetchText(url, fallback, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errText = await res.text();
        return `Error ${res.status}: ${errText}`;
      }
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const j = await res.json();
        return j.message || j.reply || JSON.stringify(j);
      }
      return await res.text();
    } catch (err) {
      return `Network error: ${err.message}`;
    }
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

  //Function to clear chat messages
  function clearChat() {
    messagesBox.innerHTML = '';
    taskShown = false;
    answerSent = false;
    hintBtn.disabled = true;
    if (quoteBlock) quoteBlock.style.display = 'none';
  }

  document.querySelectorAll('.sidebar li').forEach(li => {
    li.addEventListener('click', () => {
      hideQuote();
      document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active-topic'));
      li.classList.add('active-topic');
      selectedTopic = li.textContent.trim().toLowerCase().replace(/\s+/g, '_');
      clearChat();
      taskShown = answerSent = false;
      hintBtn.disabled = true;
      showMessage(li.textContent, 'user');
      showMessage('Select difficulty 👇', 'bot');
      diffBox.style.display = 'flex';
    });
  });
  window.chooseDifficulty = async level => {
    hideQuote();
    if (!selectedTopic) {
      showMessage('❗ Please select topic first', 'bot');
      return;
    }
    currentDifficulty = level;
    const labels = { beginner: '🟢 Beginner', medium: '🟡 Medium', hard: '🔴 Hard' };
    showMessage(labels[level], 'user');
    showMessage('Generating task…', 'bot');
    const problem = await fetchText(
      `/generate_task?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(level)}`,
      'Не удалось получить задачу.'
    );
    currentTaskText = problem; 
    showMessage(`📝 Task:\n${problem}`, 'bot');
    taskShown = answerSent = false;
    hintBtn.disabled = true;
  };

  submitCodeBtn.addEventListener('click', async () => {
    if (!selectedTopic) {
      showMessage('❗ Please select topic before sending code', 'bot');
      return;
    }
    if (!currentDifficulty) {
      showMessage('❗ Please select difficulty before sending code', 'bot');
      return;
    }
    const code = userInput.value.trim();
    if (!code) return;

    hideQuote();
    showCodeMessage(code);
    hintBtn.disabled = false;

    userInput.value = '';
    userInput.style.height = 'auto';

    // Отправляем код через POST запрос
    const response = await fetch('/evaluate_code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: currentTaskText,  
          code: code    
        })
    });
    //тут мои попытки отобразить ответ на экране(чтобы понять что оно работает)
     const result = await response.json();
let feedback = result.evaluation;

try {
  const parsed = JSON.parse(result.evaluation);
  feedback = parsed.feedback
} catch (e) {
}

showMessage(feedback, 'bot');
  });
  //тут мои потуги с отображением ответа заканчиваются

  hintBtn.addEventListener('click', async () => {
    if (!selectedTopic) {
      showMessage('❗ Please select topic first', 'bot');
      return;
    }
    if (!currentDifficulty) {
      showMessage('❗ Please select difficulty first', 'bot');
      return;
    }
    showMessage('💡 Hint please! 🥺', 'user');
    const hint = await fetchText(
      `/get_hint?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(currentDifficulty)}`,
      'Подсказка недоступна.'
    );
    showMessage(`💡 Hint: ${hint}`, 'bot');
  });

  function showHintTooltip(msg) {
    const old = hintWrapper.querySelector('.hint-tooltip');
    if (old) old.remove();
    const tip = document.createElement('div');
    tip.className = 'hint-tooltip';
    tip.textContent = msg;
    hintWrapper.appendChild(tip);
    setTimeout(() => tip.remove(), 3000);
  }
hintHelp.addEventListener('click', () => {
    if (hintBtn.disabled) showHintTooltip('❗ Send code to get a hint');
  });
});
