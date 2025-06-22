// static/script.js

document.addEventListener('DOMContentLoaded', () => {
  const messagesBox = document.getElementById('messages');
  const diffBox = document.getElementById('difficulty-buttons');
  const quoteBlock = document.querySelector('.quote');
  const userInput = document.getElementById('user-input');
  const submitCodeBtn = document.getElementById('submit-code-btn');

  // Хранение состояния
  let lastTaskJson = "";
  let selectedTopic = null;
  let currentDifficulty = null;

  // Утилиты UI
  const hideQuote = () => { if (quoteBlock) quoteBlock.style.display = 'none'; };
  const showMessage = (text, sender = 'bot') => {
    const msg = document.createElement('div'); msg.className = `message ${sender}`; msg.textContent = text;
    messagesBox.appendChild(msg); messagesBox.scrollTop = messagesBox.scrollHeight;
  };
  const showCodeMessage = (code) => {
    const msg = document.createElement('div'); msg.className = 'message user';
    const pre = document.createElement('pre'); pre.textContent = code; msg.appendChild(pre);
    messagesBox.appendChild(msg); messagesBox.scrollTop = messagesBox.scrollHeight;
  };

  // POST JSON helper
  const postJson = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  // Обработка клика по теме (не забудьте вызывать updateTopicList при загрузке)
  document.getElementById('topics-list').addEventListener('click', (e) => {
    if (e.target.tagName !== 'LI') return;
    document.querySelectorAll('#topics-list li').forEach(li => li.classList.remove('active-topic'));
    e.target.classList.add('active-topic');
    selectedTopic = e.target.textContent.trim();
    showMessage(selectedTopic, 'user');
    showMessage('Select difficulty 👇', 'bot');
    diffBox.style.display = 'flex';
  });

  // Генерация задачи
  window.chooseDifficulty = async (level) => {
    if (!selectedTopic) return showMessage('❗️ Please select topic first', 'bot');
    currentDifficulty = level;
    showMessage(`🟡 Generating ${level} task...`, 'bot');
    hideQuote();
    try {
      const { task, error } = await postJson('/send_message', { topic: selectedTopic, difficulty: level });
      if (error) return showMessage(`❌ ${error}`, 'bot');
      lastTaskJson = task;
      const t = JSON.parse(task);
      let out = `📝 ${t['Task name']}\n\n${t['Task description']}\n\nSample cases:\n`;
      t['Sample input cases'].forEach(c => out += `- Input: ${c.input} → Expected: ${c.expected_output}\n`);
      showMessage(out, 'bot');
      submitCodeBtn.disabled = false;
      userInput.disabled = false;
    } catch (e) {
      showMessage(`❌ Generation failed: ${e.message}`, 'bot');
    }
  };

  // Оценка кода
  submitCodeBtn.addEventListener('click', async () => {
    const code = userInput.value.trim();
    if (!code) return;
    console.log("→ submitting payload:", { task: lastTaskJson, code });
    showCodeMessage(code);
    showMessage('⌛ Evaluating...', 'bot');
    try {
      const { evaluation, error } = await postJson('/submit_code', { task: lastTaskJson, code });
      if (error) return showMessage(`❌ ${error}`, 'bot');
      // Распознаём JSON в блоке
      const match = evaluation.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const jsonText = match ? match[1].trim() : evaluation;
      let result;
      try { result = JSON.parse(jsonText); }
      catch { return showMessage(evaluation, 'bot'); }
      showMessage(`✅ Correct: ${result.correct ? 'Yes' : 'No'}\n📝 Feedback: ${result.feedback}`, 'bot');
    } catch (e) {
      showMessage(`❌ Evaluation failed: ${e.message}`, 'bot');
    }
  });

});
