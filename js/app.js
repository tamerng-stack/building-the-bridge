// app.js — UI wiring and practice-session logic for Building the Bridge.
// Depends on data.js and storage.js being loaded first.

const PILL_LABELS = {
  same: 'Same',
  different: 'Different',
  group: 'Group',
  exclusion: 'Exclusion',
  goestogether: 'Goes Together',
  function: 'Function',
};

const RESULT_LABELS = {
  independent: 'Independent',
  prompted: 'Prompted',
  incorrect: 'Incorrect',
  noresponse: 'No response',
};

const UNIVERSE = buildFullUniverse();

const state = {
  selectedSkills: new Set(),
  selectedCategories: new Set(),
  operator: 'Dad',
  mastery: {},
};

let progressFilter = 'all';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

// ---------- Sequence bookkeeping ----------

function fingerprintFor(selectedSkills, selectedCategories) {
  const skillsPart = SKILLS.map((s) => s.id).filter((id) => selectedSkills.has(id)).join(',');
  const catsPart = CATEGORIES.map((c) => c.id).filter((id) => selectedCategories.has(id)).join(',');
  return `${skillsPart}|${catsPart}`;
}

function ensureSequenceFresh() {
  const fp = fingerprintFor(state.selectedSkills, state.selectedCategories);
  const stored = Store.getSequenceFingerprint();
  if (stored !== fp) {
    Store.setSequenceFingerprint(fp);
    Store.setPos(0);
    Store.setLoopCount(0);
    Store.setReviewQueue([]);
    Store.setReviewTotal(0);
  }
}

function getFullList() {
  return generateFullSequence(state.selectedSkills, state.selectedCategories);
}

function isMastered(itemId) {
  const m = state.mastery[itemId];
  return !!(m && m.mastered);
}

function getActiveList(fullList) {
  return fullList.filter((item) => !isMastered(item.id));
}

function triggerReview() {
  const fullList = getFullList();
  const masteredCandidates = fullList.filter((i) => isMastered(i.id));
  if (masteredCandidates.length === 0) return;
  const shuffled = masteredCandidates.slice().sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(3, shuffled.length));
  Store.setReviewQueue(picked.map((i) => i.id));
  Store.setReviewTotal(picked.length);
}

function computePracticeState() {
  ensureSequenceFresh();
  const fullList = getFullList();

  if (fullList.length === 0) {
    return { mode: 'empty-selection' };
  }

  const reviewQueue = Store.getReviewQueue();
  if (reviewQueue.length > 0) {
    const itemId = reviewQueue[0];
    const item = UNIVERSE.byId[itemId];
    if (!item) {
      reviewQueue.shift();
      Store.setReviewQueue(reviewQueue);
      return computePracticeState();
    }
    return { mode: 'review', item };
  }

  const activeList = getActiveList(fullList);
  if (activeList.length === 0) {
    return { mode: 'all-mastered' };
  }

  let pos = Store.getPos();
  if (pos >= activeList.length || pos < 0) pos = pos % activeList.length;
  const item = activeList[pos];
  const loopCount = Store.getLoopCount();
  return {
    mode: 'normal', item, pos, total: activeList.length, cycle: loopCount + 1,
  };
}

function submitResult(result) {
  const ps = computePracticeState();
  if (ps.mode !== 'normal' && ps.mode !== 'review') return;
  const { item } = ps;
  const wasReview = ps.mode === 'review';

  let preActiveList; let prePos;
  if (!wasReview) {
    preActiveList = getActiveList(getFullList());
    prePos = ps.pos;
  }

  Store.appendLog({
    date: new Date().toISOString(),
    skillId: item.skillId,
    skillLabel: skillById(item.skillId).label,
    category: item.categoryName || '',
    prompt: item.prompt,
    result,
    who: state.operator,
    itemId: item.id,
  });

  const { mastery } = state;
  const m = mastery[item.id] || { streak: 0, mastered: false };
  const wasMasteredBefore = m.mastered;
  if (result === 'independent') {
    m.streak += 1;
    if (m.streak >= 5) m.mastered = true;
  } else {
    m.streak = 0;
    m.mastered = false;
  }
  mastery[item.id] = m;
  Store.setMastery(mastery);
  const nowMastered = m.mastered;

  if (wasReview) {
    const rq = Store.getReviewQueue();
    rq.shift();
    Store.setReviewQueue(rq);
    if (rq.length === 0) Store.setReviewTotal(0);
  } else {
    const itemWasRemoved = !wasMasteredBefore && nowMastered;
    const L = preActiveList.length;
    let rawNext = prePos + 1;
    let loopCompleted = false;
    if (rawNext >= L) { rawNext = 0; loopCompleted = true; }
    let newPos;
    if (loopCompleted) newPos = 0;
    else if (itemWasRemoved) newPos = rawNext - 1;
    else newPos = rawNext;

    if (loopCompleted) {
      const newLoopCount = Store.getLoopCount() + 1;
      Store.setLoopCount(newLoopCount);
      if (newLoopCount % 3 === 0) triggerReview();
    }
    Store.setPos(Math.max(0, newPos));
  }

  renderPractice();
}

function skipItem() {
  const ps = computePracticeState();
  if (ps.mode === 'review') {
    const rq = Store.getReviewQueue();
    rq.shift();
    Store.setReviewQueue(rq);
    if (rq.length === 0) Store.setReviewTotal(0);
  } else if (ps.mode === 'normal') {
    const activeList = getActiveList(getFullList());
    const L = activeList.length;
    let rawNext = ps.pos + 1;
    let loopCompleted = false;
    if (rawNext >= L) { rawNext = 0; loopCompleted = true; }
    if (loopCompleted) {
      const newLoopCount = Store.getLoopCount() + 1;
      Store.setLoopCount(newLoopCount);
      if (newLoopCount % 3 === 0) triggerReview();
    }
    Store.setPos(rawNext);
  }
  renderPractice();
}

// ---------- Rendering: Home ----------

function renderHome() {
  const list = document.getElementById('skills-list');
  list.innerHTML = SKILLS.map((skill) => {
    const checked = state.selectedSkills.has(skill.id) ? 'checked' : '';
    return `<li class="check-item">
      <label>
        <input type="checkbox" data-skill-id="${skill.id}" ${checked}>
        <span class="check-item-text">
          <span class="check-item-label">${escapeHtml(skill.label)}</span>
          <span class="check-item-hint">${escapeHtml(skill.hint)}</span>
        </span>
      </label>
    </li>`;
  }).join('');
  document.getElementById('home-count').textContent = `${state.selectedSkills.size} of ${SKILLS.length} skills selected.`;
}

// ---------- Rendering: Categories ----------

function renderCategories() {
  const list = document.getElementById('categories-list');
  list.innerHTML = CATEGORIES.map((cat) => {
    const checked = state.selectedCategories.has(cat.id) ? 'checked' : '';
    return `<li class="check-item">
      <label>
        <input type="checkbox" data-category-id="${cat.id}" ${checked}>
        <span class="check-item-text">
          <span class="check-item-label">${escapeHtml(cat.name)}</span>
          <span class="check-item-hint">${escapeHtml(cat.items.join(', '))}</span>
        </span>
      </label>
    </li>`;
  }).join('');
  document.getElementById('categories-count').textContent = `${state.selectedCategories.size} of ${CATEGORIES.length} categories selected.`;
}

// ---------- Rendering: Practice ----------

function renderPractice() {
  const ps = computePracticeState();
  const progressText = document.getElementById('practice-progress-text');
  const cardArea = document.getElementById('practice-card-area');
  const actions = document.getElementById('practice-actions');
  const skipBtn = document.getElementById('practice-skip');

  if (ps.mode === 'empty-selection') {
    progressText.textContent = '';
    cardArea.innerHTML = '<div class="empty-state">Nothing to practice yet — check a skill in Home, and a category in Categories if needed.</div>';
    actions.hidden = true;
    skipBtn.hidden = true;
    return;
  }

  if (ps.mode === 'all-mastered') {
    progressText.textContent = '';
    cardArea.innerHTML = '<div class="empty-state">Everything in your current selection is mastered right now — nice work! Check a few more skills or categories in Home, or check back for a review.</div>';
    actions.hidden = true;
    skipBtn.hidden = true;
    return;
  }

  actions.hidden = false;
  skipBtn.hidden = false;

  const { item } = ps;
  const skill = skillById(item.skillId);
  let reviewBanner = '';

  if (ps.mode === 'review') {
    const reviewTotal = Store.getReviewTotal();
    const remaining = Store.getReviewQueue().length;
    const current = reviewTotal - remaining + 1;
    progressText.textContent = `Review check-in · ${current} of ${reviewTotal}`;
    reviewBanner = '<div class="review-banner">He already mastered this one — quick check to make sure it stuck.</div>';
  } else {
    progressText.textContent = `Item ${ps.pos + 1} of ${ps.total} · Cycle ${ps.cycle}`;
  }

  const tags = `<div class="card-tags">
      <span class="tag tag-skill">${escapeHtml(skill.label)}</span>
      ${item.categoryName ? `<span class="tag tag-category">${escapeHtml(item.categoryName)}</span>` : ''}
    </div>`;

  const exampleLine = item.exampleAnswer
    ? `<p class="example-answer">Example answer (for you): <em>${escapeHtml(item.exampleAnswer)}</em></p>`
    : '';

  cardArea.innerHTML = `
    ${reviewBanner}
    <div class="prompt-card">
      ${tags}
      <p class="prompt-text">${escapeHtml(item.prompt)}</p>
      <p class="prompt-question">${escapeHtml(item.question)}</p>
      ${exampleLine}
    </div>
  `;
}

// ---------- Rendering: Progress ----------

function renderProgress() {
  const totalMastered = UNIVERSE.all.filter((i) => isMastered(i.id)).length;
  const totalItems = UNIVERSE.all.length;
  document.getElementById('progress-summary').textContent = `${totalMastered} of ${totalItems} total items mastered across all skills.`;

  const pillIds = ['all', ...SKILLS.map((s) => s.id)];
  document.getElementById('progress-pills').innerHTML = pillIds.map((id) => {
    const label = id === 'all' ? 'All' : PILL_LABELS[id];
    const active = progressFilter === id ? ' active' : '';
    return `<button class="pill${active}" data-filter="${id}">${label}</button>`;
  }).join('');

  const detail = document.getElementById('progress-detail');
  if (progressFilter === 'all') {
    detail.innerHTML = SKILLS.map((skill) => {
      const items = UNIVERSE.all.filter((i) => i.skillId === skill.id);
      const masteredCount = items.filter((i) => isMastered(i.id)).length;
      const pct = items.length ? Math.round((masteredCount / items.length) * 100) : 0;
      return `<div class="skill-bar-row">
        <div class="skill-bar-label"><span>${escapeHtml(skill.label)}</span><span class="skill-bar-count">${masteredCount} / ${items.length}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  } else {
    const skill = skillById(progressFilter);
    const items = UNIVERSE.all.filter((i) => i.skillId === skill.id);
    const masteredCount = items.filter((i) => isMastered(i.id)).length;
    let html = `<p class="skill-detail-summary">${masteredCount} of ${items.length} mastered in “${escapeHtml(skill.label)}.”</p>`;
    if (skill.usesCategories) {
      const log = Store.getLog();
      html += CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.categoryId === cat.id);
        const catMastered = catItems.filter((i) => isMastered(i.id)).length;
        const catLogEntries = log.filter((l) => l.itemId && l.itemId.startsWith(`${skill.id}:${cat.id}:`));
        const independentCount = catLogEntries.filter((l) => l.result === 'independent').length;
        const pctIndependent = catLogEntries.length ? Math.round((independentCount / catLogEntries.length) * 100) : 0;
        return `<div class="category-bar-row">
          <div class="skill-bar-label"><span>${escapeHtml(cat.name)}</span><span class="skill-bar-count">${catMastered} / ${catItems.length} mastered</span></div>
          <div class="bar-track"><div class="bar-fill bar-fill-gold" style="width:${pctIndependent}%"></div></div>
          <div class="category-bar-pct">${pctIndependent}% independent</div>
        </div>`;
      }).join('');
    }
    detail.innerHTML = html;
  }

  const log = Store.getLog().slice().reverse();
  const filteredLog = progressFilter === 'all' ? log : log.filter((l) => l.skillId === progressFilter);
  const tbody = filteredLog.map((entry) => {
    const d = new Date(entry.date);
    const dateStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return `<tr>
      <td>${dateStr}</td>
      <td>${escapeHtml(entry.skillLabel)}</td>
      <td>${escapeHtml(entry.category || '—')}</td>
      <td>${escapeHtml(entry.prompt)}</td>
      <td class="result-cell result-${entry.result}">${RESULT_LABELS[entry.result] || entry.result}</td>
      <td>${escapeHtml(entry.who)}</td>
    </tr>`;
  }).join('');
  document.querySelector('#progress-log-table tbody').innerHTML = tbody || '<tr><td colspan="6" class="empty-log">No sessions logged yet.</td></tr>';
}

// ---------- Tab switching ----------

function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
  if (tabId === 'practice') renderPractice();
  if (tabId === 'progress') renderProgress();
}

// ---------- Init & event wiring ----------

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW registration failed', err));
    });
  }
}

function init() {
  state.selectedSkills = Store.getSelectedSkills();
  state.selectedCategories = Store.getSelectedCategories();
  state.operator = Store.getOperator();
  state.mastery = Store.getMastery();

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Home
  renderHome();
  document.getElementById('skills-list').addEventListener('change', (e) => {
    const id = e.target.dataset.skillId;
    if (!id) return;
    if (e.target.checked) state.selectedSkills.add(id); else state.selectedSkills.delete(id);
    Store.setSelectedSkills(state.selectedSkills);
    renderHome();
  });
  document.getElementById('home-select-all').addEventListener('click', () => {
    state.selectedSkills = new Set(SKILLS.map((s) => s.id));
    Store.setSelectedSkills(state.selectedSkills);
    renderHome();
  });
  document.getElementById('home-clear-all').addEventListener('click', () => {
    state.selectedSkills = new Set();
    Store.setSelectedSkills(state.selectedSkills);
    renderHome();
  });

  // Categories
  renderCategories();
  document.getElementById('categories-list').addEventListener('change', (e) => {
    const id = e.target.dataset.categoryId;
    if (!id) return;
    if (e.target.checked) state.selectedCategories.add(id); else state.selectedCategories.delete(id);
    Store.setSelectedCategories(state.selectedCategories);
    renderCategories();
  });
  document.getElementById('categories-select-all').addEventListener('click', () => {
    state.selectedCategories = new Set(CATEGORIES.map((c) => c.id));
    Store.setSelectedCategories(state.selectedCategories);
    renderCategories();
  });
  document.getElementById('categories-clear-all').addEventListener('click', () => {
    state.selectedCategories = new Set();
    Store.setSelectedCategories(state.selectedCategories);
    renderCategories();
  });

  // Practice
  const operatorSelect = document.getElementById('operator-select');
  operatorSelect.value = state.operator;
  operatorSelect.addEventListener('change', () => {
    state.operator = operatorSelect.value;
    Store.setOperator(state.operator);
  });
  document.getElementById('practice-actions').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-result]');
    if (!btn) return;
    submitResult(btn.dataset.result);
  });
  document.getElementById('practice-skip').addEventListener('click', () => skipItem());
  renderPractice();

  // Progress
  document.getElementById('progress-pills').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    progressFilter = btn.dataset.filter;
    renderProgress();
  });
  document.getElementById('reset-progress-btn').addEventListener('click', () => {
    const ok = window.confirm('Reset all saved progress? This clears mastery and the session log, but keeps your skill and category selections. This cannot be undone.');
    if (!ok) return;
    Store.resetProgress();
    state.mastery = {};
    progressFilter = 'all';
    renderProgress();
    renderPractice();
  });
  renderProgress();

  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);
