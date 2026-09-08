// storage.js — thin localStorage wrapper with safe defaults.
// All Building the Bridge data lives under keys prefixed "btb_".

const STORAGE_KEYS = {
  skills: 'btb_skills_v1',
  categories: 'btb_categories_v1',
  operator: 'btb_operator_v1',
  mastery: 'btb_mastery_v1',
  log: 'btb_log_v1',
  sequenceFingerprint: 'btb_seq_fingerprint_v1',
  pos: 'btb_seq_pos_v1',
  loopCount: 'btb_loop_count_v1',
  reviewQueue: 'btb_review_queue_v1',
  reviewTotal: 'btb_review_total_v1',
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read', key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('Could not save', key, e);
    return false;
  }
}

const Store = {
  // --- Skill selection (Home tab) ---
  getSelectedSkills() {
    const arr = readJSON(STORAGE_KEYS.skills, null);
    if (arr === null) return new Set(DEFAULT_ACTIVE_SKILLS);
    return new Set(arr);
  },
  setSelectedSkills(setOrArray) {
    writeJSON(STORAGE_KEYS.skills, Array.from(setOrArray));
  },

  // --- Category selection (Categories tab) ---
  getSelectedCategories() {
    const arr = readJSON(STORAGE_KEYS.categories, null);
    if (arr === null) return new Set(CATEGORIES.map((c) => c.id));
    return new Set(arr);
  },
  setSelectedCategories(setOrArray) {
    writeJSON(STORAGE_KEYS.categories, Array.from(setOrArray));
  },

  // --- "Who's running this" ---
  getOperator() {
    return readJSON(STORAGE_KEYS.operator, 'Dad');
  },
  setOperator(name) {
    writeJSON(STORAGE_KEYS.operator, name);
  },

  // --- Mastery: { [itemId]: { streak: number, mastered: boolean } } ---
  getMastery() {
    return readJSON(STORAGE_KEYS.mastery, {});
  },
  setMastery(map) {
    writeJSON(STORAGE_KEYS.mastery, map);
  },

  // --- Log: array of { date, skill, category, prompt, result, who, itemId } ---
  getLog() {
    return readJSON(STORAGE_KEYS.log, []);
  },
  setLog(arr) {
    writeJSON(STORAGE_KEYS.log, arr);
  },
  appendLog(entry) {
    const log = Store.getLog();
    log.push(entry);
    Store.setLog(log);
  },

  // --- Practice sequence position state ---
  getSequenceFingerprint() {
    return readJSON(STORAGE_KEYS.sequenceFingerprint, null);
  },
  setSequenceFingerprint(fp) {
    writeJSON(STORAGE_KEYS.sequenceFingerprint, fp);
  },
  getPos() {
    return readJSON(STORAGE_KEYS.pos, 0);
  },
  setPos(pos) {
    writeJSON(STORAGE_KEYS.pos, pos);
  },
  getLoopCount() {
    return readJSON(STORAGE_KEYS.loopCount, 0);
  },
  setLoopCount(n) {
    writeJSON(STORAGE_KEYS.loopCount, n);
  },
  getReviewQueue() {
    return readJSON(STORAGE_KEYS.reviewQueue, []);
  },
  setReviewQueue(arr) {
    writeJSON(STORAGE_KEYS.reviewQueue, arr);
  },
  getReviewTotal() {
    return readJSON(STORAGE_KEYS.reviewTotal, 0);
  },
  setReviewTotal(n) {
    writeJSON(STORAGE_KEYS.reviewTotal, n);
  },

  // --- Reset progress only (skills/category selections untouched) ---
  resetProgress() {
    Store.setMastery({});
    Store.setLog([]);
    Store.setPos(0);
    Store.setLoopCount(0);
    Store.setReviewQueue([]);
    Store.setReviewTotal(0);
    Store.setSequenceFingerprint(null);
  },
};
