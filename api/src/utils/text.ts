export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function chunkText(input: string, chunkSize = 700): string[] {
  const normalized = input.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (block.length <= chunkSize) {
      current = block;
      continue;
    }

    for (let i = 0; i < block.length; i += chunkSize) {
      chunks.push(block.slice(i, i + chunkSize).trim());
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

const stopWords = new Set([
  'a',
  'an',
  'about',
  'and',
  'are',
  'at',
  'be',
  'can',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'please',
  'question',
  'the',
  'tell',
  'to',
  'what',
  'when',
  'where',
  'who',
  'why',
  'with',
  'write',
  'you',
  'your',
]);

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/\blog\s*in\b/g, 'login')
    .replace(/\blog\s*on\b/g, 'login')
    .replace(/\bsign\s*in\b/g, 'login')
    .replace(/\bsign\s*on\b/g, 'login')
    .replace(/\bwi[-\s]*fi\b/g, 'wifi')
    .replace(/\be[-\s]*mail\b/g, 'email')
    .replace(/[`*_#>(){}:;,.!?/\\-]+|\[|\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchText(input: string): string[] {
  return normalizeSearchText(input)
    .split(' ')
    .map(canonicalizeSearchToken)
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function canonicalizeSearchToken(token: string): string {
  const aliases: Record<string, string> = {
    accessing: 'access',
    access: 'access',
    account: 'account',
    accounts: 'account',
    assignment: 'assignment',
    assignments: 'assignment',
    blocked: 'locked',
    browser: 'browser',
    browsers: 'browser',
    cached: 'cache',
    caching: 'cache',
    code: 'code',
    codes: 'code',
    computer: 'computer',
    computers: 'computer',
    credential: 'credentials',
    credentials: 'credentials',
    disabled: 'disabled',
    downloading: 'download',
    downloads: 'download',
    emailed: 'email',
    emails: 'email',
    error: 'error',
    errors: 'error',
    exam: 'exam',
    exams: 'exam',
    file: 'file',
    files: 'file',
    forgot: 'reset',
    internet: 'network',
    laptop: 'device',
    laptops: 'device',
    locked: 'locked',
    mail: 'email',
    mails: 'email',
    network: 'network',
    networks: 'network',
    opening: 'open',
    opens: 'open',
    password: 'password',
    passwords: 'password',
    phishing: 'suspicious',
    portal: 'portal',
    printers: 'printer',
    printing: 'printer',
    projectors: 'projector',
    quiz: 'quiz',
    quizzes: 'quiz',
    scanner: 'scanner',
    scanners: 'scanner',
    signin: 'login',
    upload: 'upload',
    uploaded: 'upload',
    uploading: 'upload',
    uploads: 'upload',
    username: 'credentials',
    usernames: 'credentials',
    webpage: 'page',
    website: 'page',
    wifi: 'wifi',
    wireless: 'wifi',
  };

  return aliases[token] ?? token;
}

export function keywordOverlapScore(query: string, text: string): number {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedText = normalizeSearchText(text);

  if (!normalizedQuery || !normalizedText) {
    return 0;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return 1;
  }

  const queryTokens = tokenizeSearchText(query);
  if (queryTokens.length === 0) {
    return 0;
  }

  const textTokens = new Set(tokenizeSearchText(text));
  if (textTokens.size === 0) {
    return 0;
  }

  let hits = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) {
      hits += 1;
    }
  }

  const minimumHits = queryTokens.length === 1 ? 1 : 2;
  if (hits < minimumHits) {
    return 0;
  }

  const coverage = hits / queryTokens.length;
  const density = hits / Math.max(6, textTokens.size);
  return Math.min(1, coverage * 0.85 + density * 0.15);
}

export function extractQuestionAnswerPairs(
  input: string,
): Array<{ question: string; answer: string }> {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const pairs: Array<{ question: string; answer: string }> = [];

  let currentQuestion: string | null = null;
  let currentAnswerLines: string[] = [];
  let collectingAnswer = false;

  const flush = () => {
    if (!currentQuestion) {
      return;
    }

    const answer = currentAnswerLines.join(' ').replace(/\s+/g, ' ').trim();
    if (answer) {
      pairs.push({
        question: currentQuestion,
        answer,
      });
    }

    currentQuestion = null;
    currentAnswerLines = [];
    collectingAnswer = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (collectingAnswer && line.startsWith('#')) {
      flush();
      continue;
    }

    const questionMatch = line.match(/^q:\s*(.+)$/i);
    if (questionMatch) {
      flush();
      currentQuestion = questionMatch[1].trim();
      continue;
    }

    const answerMatch = line.match(/^a:\s*(.+)$/i);
    if (answerMatch && currentQuestion) {
      collectingAnswer = true;
      currentAnswerLines.push(answerMatch[1].trim());
      continue;
    }

    if (collectingAnswer && currentQuestion) {
      currentAnswerLines.push(line);
    }
  }

  flush();

  return pairs;
}
