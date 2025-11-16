// Smart task suggestions based on context - completely offline
interface TaskContext {
  listName?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  recentTasks?: string[];
}

// Common task templates by category
const TASK_TEMPLATES: Record<string, string[]> = {
  // Work/Coding
  work: [
    'Review pull request',
    'Update documentation',
    'Fix bug in',
    'Implement feature',
    'Deploy to production',
    'Code review for',
    'Refactor',
    'Write unit tests for',
    'Optimize performance',
    'Update dependencies',
  ],
  coding: [
    'Debug',
    'Build feature',
    'Write tests for',
    'Fix memory leak',
    'Implement API endpoint',
    'Update README',
    'Refactor code',
    'Add error handling',
    'Setup CI/CD',
    'Review code',
  ],
  // Study/School
  study: [
    'Read chapter',
    'Study for exam',
    'Complete homework',
    'Review notes',
    'Prepare presentation',
    'Watch lecture',
    'Practice problems',
    'Create flashcards',
    'Attend study group',
    'Research topic',
  ],
  school: [
    'Submit assignment',
    'Prepare for quiz',
    'Complete lab report',
    'Attend class',
    'Review syllabus',
    'Group project meeting',
    'Office hours',
    'Study guide',
  ],
  math: [
    'Solve practice problems',
    'Review formulas',
    'Complete homework set',
    'Study theorem',
    'Practice equations',
    'Watch tutorial',
  ],
  science: [
    'Lab experiment',
    'Write lab report',
    'Study for test',
    'Research paper',
    'Review concepts',
  ],
  // Personal
  personal: [
    'Call',
    'Email',
    'Schedule appointment',
    'Buy',
    'Plan',
    'Organize',
    'Clean',
    'Pay bills',
    'Exercise',
    'Meal prep',
  ],
  // Generic
  general: [
    'Complete',
    'Finish',
    'Start',
    'Review',
    'Update',
    'Plan',
    'Organize',
    'Prepare',
    'Submit',
    'Schedule',
  ],
};

// Action verbs for task completion
const ACTION_VERBS = [
  'Complete', 'Finish', 'Start', 'Review', 'Update', 'Create', 'Write',
  'Read', 'Study', 'Practice', 'Prepare', 'Submit', 'Schedule', 'Plan',
  'Organize', 'Fix', 'Debug', 'Implement', 'Build', 'Design', 'Test',
  'Deploy', 'Refactor', 'Optimize', 'Document', 'Research', 'Analyze',
];

// Common task completions
const COMMON_COMPLETIONS: Record<string, string[]> = {
  'read': ['Read chapter 5', 'Read documentation', 'Read research paper', 'Read email'],
  'write': ['Write essay', 'Write report', 'Write documentation', 'Write code'],
  'study': ['Study for exam', 'Study chapter', 'Study notes', 'Study guide'],
  'complete': ['Complete assignment', 'Complete homework', 'Complete project', 'Complete task'],
  'review': ['Review pull request', 'Review notes', 'Review code', 'Review document'],
  'fix': ['Fix bug', 'Fix typo', 'Fix error', 'Fix issue'],
  'prepare': ['Prepare presentation', 'Prepare for meeting', 'Prepare materials', 'Prepare report'],
  'submit': ['Submit assignment', 'Submit report', 'Submit application', 'Submit form'],
  'schedule': ['Schedule meeting', 'Schedule appointment', 'Schedule call', 'Schedule interview'],
  'finish': ['Finish project', 'Finish homework', 'Finish report', 'Finish task'],
  'update': ['Update documentation', 'Update code', 'Update website', 'Update dependencies'],
  'create': ['Create document', 'Create presentation', 'Create design', 'Create plan'],
  'debug': ['Debug application', 'Debug code', 'Debug issue', 'Debug error'],
  'implement': ['Implement feature', 'Implement function', 'Implement API', 'Implement design'],
  'practice': ['Practice problems', 'Practice coding', 'Practice exercises', 'Practice questions'],
};

/**
 * Get smart task suggestions based on partial input and context
 */
export function getTaskSuggestions(
  partialInput: string,
  context: TaskContext
): string[] {
  const input = partialInput.trim().toLowerCase();
  
  if (input.length < 2) {
    // Show context-based suggestions for very short input
    return getContextSuggestions(context).slice(0, 5);
  }

  const suggestions: string[] = [];

  // 1. Check for action verb completions
  const firstWord = input.split(' ')[0];
  if (COMMON_COMPLETIONS[firstWord]) {
    const completions = COMMON_COMPLETIONS[firstWord]
      .filter(s => s.toLowerCase().startsWith(input))
      .slice(0, 3);
    suggestions.push(...completions);
  }

  // 2. Match against category templates
  const categoryKey = getCategoryKey(context.listName);
  if (categoryKey && TASK_TEMPLATES[categoryKey]) {
    const categoryMatches = TASK_TEMPLATES[categoryKey]
      .filter(template => template.toLowerCase().includes(input))
      .slice(0, 3);
    suggestions.push(...categoryMatches);
  }

  // 3. Match against recent tasks (fuzzy matching)
  if (context.recentTasks && context.recentTasks.length > 0) {
    const recentMatches = context.recentTasks
      .filter(task => task.toLowerCase().includes(input))
      .slice(0, 2);
    suggestions.push(...recentMatches);
  }

  // 4. Smart completions based on partial input patterns
  const smartCompletions = getSmartCompletions(input, context);
  suggestions.push(...smartCompletions);

  // 5. Remove duplicates and limit
  const uniqueSuggestions = [...new Set(suggestions)];
  
  // Prioritize exact prefix matches
  return uniqueSuggestions
    .sort((a, b) => {
      const aExact = a.toLowerCase().startsWith(input) ? 0 : 1;
      const bExact = b.toLowerCase().startsWith(input) ? 0 : 1;
      return aExact - bExact;
    })
    .slice(0, 5);
}

/**
 * Get suggestions based only on context (for empty/very short input)
 */
function getContextSuggestions(context: TaskContext): string[] {
  const suggestions: string[] = [];
  
  // Priority-based suggestions
  if (context.priority === 'high') {
    suggestions.push('URGENT: ', 'Critical: ', 'Important: ');
  }

  // Date-based suggestions
  if (context.dueDate) {
    const isToday = context.dueDate.toDateString() === new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = context.dueDate.toDateString() === tomorrow.toDateString();

    if (isToday) {
      suggestions.push('Complete today:', 'Finish today:', 'Review today:');
    } else if (isTomorrow) {
      suggestions.push('Prepare for tomorrow:', 'Start tomorrow:');
    }
  }

  // Category-based suggestions
  const categoryKey = getCategoryKey(context.listName);
  if (categoryKey && TASK_TEMPLATES[categoryKey]) {
    suggestions.push(...TASK_TEMPLATES[categoryKey].slice(0, 3));
  }

  return suggestions;
}

/**
 * Generate smart completions based on input patterns
 */
function getSmartCompletions(input: string, context: TaskContext): string[] {
  const completions: string[] = [];
  
  // Pattern: "read [something]"
  if (input.startsWith('read')) {
    completions.push(
      `Read ${context.listName || 'material'} notes`,
      'Read chapter',
      'Read assignment'
    );
  }
  
  // Pattern: "write [something]"
  if (input.startsWith('write')) {
    completions.push(
      `Write ${context.listName || 'document'}`,
      'Write essay',
      'Write report'
    );
  }
  
  // Pattern: "study [something]"
  if (input.startsWith('study')) {
    completions.push(
      'Study for exam',
      `Study ${context.listName || 'material'}`,
      'Study notes'
    );
  }
  
  // Pattern: "complete [something]"
  if (input.startsWith('complete') || input.startsWith('finish')) {
    completions.push(
      `Complete ${context.listName || 'task'}`,
      'Complete assignment',
      'Complete project'
    );
  }
  
  // Pattern: numbers (chapter, page, etc.)
  if (/\d/.test(input)) {
    completions.push(
      `${input} - Review`,
      `Chapter ${input}`,
      `Page ${input}`
    );
  }

  return completions;
}

/**
 * Map list name to category key
 */
function getCategoryKey(listName?: string): string {
  if (!listName) return 'general';
  
  const name = listName.toLowerCase();
  
  if (name.includes('work') || name.includes('job')) return 'work';
  if (name.includes('cod') || name.includes('program') || name.includes('dev')) return 'coding';
  if (name.includes('study') || name.includes('learn')) return 'study';
  if (name.includes('school') || name.includes('class')) return 'school';
  if (name.includes('math') || name.includes('calcul')) return 'math';
  if (name.includes('science') || name.includes('physics') || name.includes('chem')) return 'science';
  if (name.includes('personal') || name.includes('life')) return 'personal';
  
  return 'general';
}

/**
 * Get quick action suggestions (like iOS QuickType)
 */
export function getQuickActions(context: TaskContext): string[] {
  const actions: string[] = [];
  
  const categoryKey = getCategoryKey(context.listName);
  
  // Add relevant action verbs based on category
  if (categoryKey === 'coding' || categoryKey === 'work') {
    actions.push('Fix', 'Review', 'Update', 'Deploy', 'Test');
  } else if (categoryKey === 'study' || categoryKey === 'school') {
    actions.push('Study', 'Read', 'Complete', 'Review', 'Practice');
  } else {
    actions.push('Complete', 'Start', 'Finish', 'Review', 'Plan');
  }
  
  return actions.slice(0, 5);
}
