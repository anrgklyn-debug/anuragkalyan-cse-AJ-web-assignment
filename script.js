const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE_KEY = 'studyspace-anurag-v1';
let state = { tasks: [], focusMinutes: 0, goals: {}, dark: false };
let filter = 'all';
let selectedMinutes = 25;
let remainingSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;
let toastTimeout = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') state = { ...state, ...saved };
  } catch (e) { /* Start with a clean state if local storage is unavailable. */ }
  document.body.classList.toggle('dark', !!state.dark);
  $('#theme-toggle').textContent = state.dark ? '☀' : '☾';
  $$('[data-goal]').forEach(input => input.checked = !!state.goals[input.dataset.goal]);
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { showToast('Could not save locally in this browser.'); }
}
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}
function renderTasks() {
  const list = $('#task-list');
  list.innerHTML = '';
  const shown = state.tasks.filter(task => filter === 'all' || (filter === 'active' ? !task.done : task.done));
  shown.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-row${task.done ? ' done' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.className = 'task-check'; checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', `Mark ${task.text} ${task.done ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked; saveState(); renderTasks();
      showToast(task.done ? 'Nice work — task completed!' : 'Task moved back to to-do.');
    });
    const name = document.createElement('span'); name.className = 'task-name'; name.textContent = task.text;
    const priority = document.createElement('span'); priority.className = `priority ${task.priority}`; priority.textContent = task.priority;
    const del = document.createElement('button'); del.className = 'delete-task'; del.textContent = '×'; del.title = 'Delete task'; del.setAttribute('aria-label', `Delete ${task.text}`);
    del.addEventListener('click', () => { state.tasks = state.tasks.filter(item => item.id !== task.id); saveState(); renderTasks(); showToast('Task removed.'); });
    li.append(checkbox, name, priority, del); list.append(li);
  });
  $('#empty-state').hidden = shown.length > 0;
  const completed = state.tasks.filter(task => task.done).length;
  const total = state.tasks.length;
  const rate = total ? Math.round(completed / total * 100) : 0;
  $('#completed-count').textContent = completed;
  $('#total-count').textContent = total;
  $('#task-progress').style.width = `${rate}%`;
  $('#completion-rate').textContent = rate;
  $('#rate-line-fill').style.width = `${rate}%`;
  $('#task-progress-label').textContent = total ? `${completed} of ${total} tasks completed.` : 'Your day starts with one task.';
  $('#task-badge').textContent = `${total} ${total === 1 ? 'task' : 'tasks'}`;
}
function updateFocusDisplay() {
  const mins = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
  const secs = (remainingSeconds % 60).toString().padStart(2, '0');
  $('#timer-display').textContent = `${mins}:${secs}`;
  const circumference = 2 * Math.PI * 94;
  const fraction = remainingSeconds / (selectedMinutes * 60);
  $('#timer-progress').style.strokeDasharray = circumference;
  $('#timer-progress').style.strokeDashoffset = circumference * (1 - fraction);
}
function stopTimer() {
  clearInterval(timerInterval); timerInterval = null; timerRunning = false;
  $('#timer-start').textContent = 'Start focus';
}
function startTimer() {
  if (timerRunning) {
    stopTimer(); $('#timer-status').textContent = 'Paused — take your time.'; return;
  }
  if (remainingSeconds <= 0) remainingSeconds = selectedMinutes * 60;
  timerRunning = true; $('#timer-start').textContent = 'Pause session'; $('#timer-status').textContent = 'You are in the zone.';
  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateFocusDisplay();
    if (remainingSeconds <= 0) {
      stopTimer();
      if ($('#timer-mode').textContent === 'FOCUS TIME') {
        state.focusMinutes += selectedMinutes; saveState(); updateStats();
        showToast('Focus session complete. Time for a breather!');
      } else showToast('Break complete. Ready to focus again?');
      $('#timer-status').textContent = 'Session complete!';
      $('#timer-start').textContent = 'Start again';
    }
  }, 1000);
}
function updateStats() { $('#focus-minutes').textContent = state.focusMinutes; }
function selectTimer(minutes, mode) {
  stopTimer(); selectedMinutes = minutes; remainingSeconds = minutes * 60;
  $('#timer-mode').textContent = mode === 'Focus' ? 'FOCUS TIME' : 'BREAK TIME';
  $('#timer-status').textContent = mode === 'Focus' ? 'Ready when you are' : 'Recharge your mind';
  $('#timer-start').textContent = mode === 'Focus' ? 'Start focus' : 'Start break';
  $$('.mode-button').forEach(button => button.classList.toggle('active', Number(button.dataset.minutes) === minutes && button.dataset.mode === mode));
  updateFocusDisplay();
}
function renderGoals() {
  const count = Object.values(state.goals).filter(Boolean).length;
  $('#goals-progress-label').textContent = `${count} of 3 goals complete`;
  $('#goals-progress-fill').style.width = `${count / 3 * 100}%`;
}
$('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#task-input');
  const text = input.value.trim();
  if (!text) return;
  state.tasks.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, priority: $('#task-priority').value, done: false });
  input.value = ''; filter = 'all';
  $$('.filter-button').forEach(button => button.classList.toggle('active', button.dataset.filter === 'all'));
  saveState(); renderTasks(); showToast('Task added to your plan.');
});
$$('.filter-button').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  $$('.filter-button').forEach(item => item.classList.toggle('active', item === button));
  renderTasks();
}));
$$('.mode-button').forEach(button => button.addEventListener('click', () => selectTimer(Number(button.dataset.minutes), button.dataset.mode)));
$('#timer-start').addEventListener('click', startTimer);
$('#timer-reset').addEventListener('click', () => { stopTimer(); remainingSeconds = selectedMinutes * 60; updateFocusDisplay(); $('#timer-status').textContent = 'Ready when you are'; showToast('Timer reset.'); });
$('#theme-toggle').addEventListener('click', () => {
  state.dark = !state.dark; document.body.classList.toggle('dark', state.dark);
  $('#theme-toggle').textContent = state.dark ? '☀' : '☾'; saveState();
});
$$('[data-goal]').forEach(input => input.addEventListener('change', () => {
  state.goals[input.dataset.goal] = input.checked; saveState(); renderGoals();
  showToast(input.checked ? 'Weekly goal checked off!' : 'Weekly goal updated.');
}));
const today = new Date();
$('#today-label').textContent = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
loadState(); renderTasks(); updateStats(); renderGoals(); updateFocusDisplay();
