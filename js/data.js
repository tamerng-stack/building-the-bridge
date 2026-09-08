// data.js — static content and drill-generation logic for Building the Bridge.
// No dependencies; loaded before storage.js and app.js.

const CATEGORIES = [
  { id: 'animals', name: 'Animals', items: ['dog', 'cat', 'rabbit', 'duck'] },
  { id: 'appliances', name: 'Appliances', items: ['fridge', 'microwave', 'oven', 'washing machine'] },
  { id: 'furniture', name: 'Furniture', items: ['chair', 'table', 'bed', 'couch'] },
  { id: 'clothing', name: 'Clothing', items: ['shirt', 'pants', 'shoes', 'socks'] },
  { id: 'fruits', name: 'Fruits', items: ['apple', 'banana', 'orange', 'grape'] },
  { id: 'vegetables', name: 'Vegetables', items: ['carrot', 'broccoli', 'potato', 'corn'] },
  { id: 'vehicles', name: 'Vehicles', items: ['car', 'bus', 'bike', 'truck'] },
  { id: 'sports', name: 'Sports equipment', items: ['basketball', 'tennis ball', 'ice skates', 'swimsuit'] },
  { id: 'kitchen', name: 'Kitchen tools', items: ['spoon', 'fork', 'knife', 'pot'] },
  { id: 'bodyparts', name: 'Body parts', items: ['hand', 'foot', 'head', 'arm'] },
  { id: 'weather', name: 'Weather', items: ['rain', 'snow', 'sun', 'wind'] },
  { id: 'family', name: 'Family members', items: ['mom', 'dad', 'sister', 'brother'] },
  { id: 'colors', name: 'Colors', items: ['red', 'blue', 'green', 'yellow'] },
  { id: 'shapes', name: 'Shapes', items: ['circle', 'square', 'triangle', 'rectangle'] },
  { id: 'school', name: 'School supplies', items: ['pencil', 'paper', 'backpack', 'book'] },
];

const SKILLS = [
  {
    id: 'same',
    label: 'How are they the same?',
    hint: 'Comparing two items in the same category and naming what they share.',
    usesCategories: true,
    question: 'How are they the same?',
  },
  {
    id: 'different',
    label: 'How are they different?',
    hint: 'Comparing two items in the same category and naming one way they differ.',
    usesCategories: true,
    question: 'How are they different?',
  },
  {
    id: 'group',
    label: 'What group is it in?',
    hint: 'Naming the category a single item belongs to.',
    usesCategories: true,
    question: 'What group is it in?',
  },
  {
    id: 'exclusion',
    label: "Which one doesn't belong?",
    hint: "Given three items, spotting the one that isn't like the others.",
    usesCategories: true,
    question: "Which one doesn't belong?",
  },
  {
    id: 'goestogether',
    label: 'What goes together?',
    hint: 'Naming everyday items used together, even when they aren’t the same type of thing.',
    usesCategories: false,
    question: 'What goes together?',
  },
  {
    id: 'function',
    label: 'What do you use it for?',
    hint: 'Describing what an everyday item is used for.',
    usesCategories: false,
    question: 'What do you use it for?',
  },
];

const DEFAULT_ACTIVE_SKILLS = ['same', 'different'];

const GOES_TOGETHER = [
  ['shoe', 'sock'],
  ['toothbrush', 'toothpaste'],
  ['bread', 'butter'],
  ['pencil', 'paper'],
  ['key', 'door'],
  ['rain', 'umbrella'],
  ['soap', 'water'],
  ['plate', 'fork'],
  ['pillow', 'blanket'],
  ['ball', 'glove'],
  ['book', 'backpack'],
  ['cup', 'water'],
];

const FUNCTION_ITEMS = [
  { item: 'spoon', example: 'to eat soup or cereal' },
  { item: 'umbrella', example: 'to stay dry in the rain' },
  { item: 'toothbrush', example: 'to brush your teeth' },
  { item: 'key', example: 'to open a door or a lock' },
  { item: 'towel', example: 'to dry off' },
  { item: 'scissors', example: 'to cut paper' },
  { item: 'blanket', example: 'to stay warm' },
  { item: 'backpack', example: 'to carry your things to school' },
  { item: 'soap', example: 'to wash your hands' },
  { item: 'broom', example: 'to sweep the floor' },
];

function cap(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function skillById(id) {
  return SKILLS.find((s) => s.id === id);
}

function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id);
}

// Generates the ordered drill items for one skill.
// selectedCategoryIds: a Set of category ids to include, or null to include all
// (null is used when building the "full universe" for totals/mastery lookups).
function generateItemsForSkill(skillId, selectedCategoryIds) {
  const skill = skillById(skillId);
  const out = [];

  const includeCategory = (catId) => selectedCategoryIds === null || selectedCategoryIds.has(catId);

  if (skillId === 'same' || skillId === 'different') {
    CATEGORIES.forEach((cat) => {
      if (!includeCategory(cat.id)) return;
      const pairs = [
        [cat.items[0], cat.items[1]],
        [cat.items[2], cat.items[3]],
      ];
      pairs.forEach((pair, idx) => {
        out.push({
          id: `${skillId}:${cat.id}:${idx}`,
          skillId,
          categoryId: cat.id,
          categoryName: cat.name,
          prompt: `${cap(pair[0])} & ${cap(pair[1])}`,
          question: skill.question,
          exampleAnswer: null,
        });
      });
    });
  } else if (skillId === 'group') {
    CATEGORIES.forEach((cat) => {
      if (!includeCategory(cat.id)) return;
      cat.items.forEach((item, idx) => {
        out.push({
          id: `group:${cat.id}:${idx}`,
          skillId,
          categoryId: cat.id,
          categoryName: cat.name,
          prompt: cap(item),
          question: skill.question,
          exampleAnswer: cat.name,
        });
      });
    });
  } else if (skillId === 'exclusion') {
    CATEGORIES.forEach((cat, fullIdx) => {
      if (!includeCategory(cat.id)) return;
      const nextCat = CATEGORIES[(fullIdx + 1) % CATEGORIES.length];
      const sets = [
        { two: [cat.items[0], cat.items[1]], odd: nextCat.items[0] },
        { two: [cat.items[2], cat.items[3]], odd: nextCat.items[1] },
      ];
      sets.forEach((s, idx) => {
        out.push({
          id: `exclusion:${cat.id}:${idx}`,
          skillId,
          categoryId: cat.id,
          categoryName: cat.name,
          prompt: `${cap(s.two[0])}, ${cap(s.two[1])}, ${cap(s.odd)}`,
          question: skill.question,
          exampleAnswer: null,
        });
      });
    });
  } else if (skillId === 'goestogether') {
    GOES_TOGETHER.forEach((pair, idx) => {
      out.push({
        id: `goestogether:${idx}`,
        skillId,
        categoryId: null,
        categoryName: null,
        prompt: `${cap(pair[0])} & ${cap(pair[1])}`,
        question: skill.question,
        exampleAnswer: null,
      });
    });
  } else if (skillId === 'function') {
    FUNCTION_ITEMS.forEach((f, idx) => {
      out.push({
        id: `function:${idx}`,
        skillId,
        categoryId: null,
        categoryName: null,
        prompt: cap(f.item),
        question: skill.question,
        exampleAnswer: f.example,
      });
    });
  }

  return out;
}

// Builds the full ordered list across every selected skill (table order),
// respecting category selection only for category-based skills.
function generateFullSequence(selectedSkillIds, selectedCategoryIds) {
  const out = [];
  SKILLS.forEach((skill) => {
    if (!selectedSkillIds.has(skill.id)) return;
    const catFilter = skill.usesCategories ? selectedCategoryIds : null;
    out.push(...generateItemsForSkill(skill.id, catFilter));
  });
  return out;
}

// The complete universe of items regardless of any current toggle state.
// Used for mastery totals and for reconstructing review items.
function buildFullUniverse() {
  const all = [];
  SKILLS.forEach((skill) => {
    all.push(...generateItemsForSkill(skill.id, null));
  });
  const byId = {};
  all.forEach((item) => {
    byId[item.id] = item;
  });
  return { all, byId };
}
