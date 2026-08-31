import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createHash } from 'crypto';
import { extractQuestionAnswerPairs, keywordOverlapScore } from '../utils/text';
import { SupportArea } from '../common/enums';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | null;
  private readonly modelName: string;
  private readonly embeddingModelName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') ?? null;
    this.modelName =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-1.5-flash';
    this.embeddingModelName =
      this.configService.get<string>('GEMINI_EMBEDDING_MODEL') ??
      'text-embedding-004';

    if (!this.apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. Falling back to deterministic local logic.',
      );
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!text.trim()) {
      return [];
    }

    if (!this.apiKey) {
      return this.fallbackEmbedding(text);
    }

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: this.embeddingModelName,
      });
      const result = await model.embedContent(text);
      const values = result.embedding.values ?? [];
      return values.length > 0 ? values : this.fallbackEmbedding(text);
    } catch (error) {
      this.logger.warn(
        `Gemini embedding call failed. Using fallback. ${String(error)}`,
      );
      return this.fallbackEmbedding(text);
    }
  }

  async answerWithContext(
    question: string,
    contexts: string[],
    supportArea?: SupportArea | null,
  ): Promise<string> {
    const contextText = contexts
      .map((value, index) => `[${index + 1}] ${value}`)
      .join('\n\n');

    const prompt = [
      'You are a college support assistant for registration and IT.',
      'Only answer from the provided trusted context.',
      'If context is insufficient, respond exactly with: CONTEXT_INSUFFICIENT.',
      'Give a concise, practical answer with the next steps the student should take.',
      'Never ask for or reveal passwords, one-time codes, private tokens, payment card details, or sensitive documents.',
      ...(supportArea === SupportArea.IT
        ? [
            'This is an IT support question. For account-specific, device-specific, Wi-Fi, email, portal, exam platform, or access-right issues, explain safe troubleshooting steps and tell the student what details to include in an IT ticket.',
            'Do not claim that you reset passwords, unlock accounts, change access rights, fix Wi-Fi, or verify private account status.',
          ]
        : []),
      '',
      `Question: ${question}`,
      '',
      `Trusted context:\n${contextText}`,
    ].join('\n');

    if (!this.apiKey) {
      return this.answerWithLocalContext(question, contexts);
    }

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text.trim() || 'CONTEXT_INSUFFICIENT.';
    } catch (error) {
      this.logger.warn(`Gemini answer call failed. ${String(error)}`);
      return contexts.length > 0
        ? this.answerWithLocalContext(question, contexts)
        : 'CONTEXT_INSUFFICIENT.';
    }
  }

  isUsingLocalFallback(): boolean {
    return !this.apiKey;
  }

  private answerWithLocalContext(question: string, contexts: string[]): string {
    if (contexts.length === 0) {
      return 'CONTEXT_INSUFFICIENT.';
    }

    const qaCandidates = contexts.flatMap((context) =>
      extractQuestionAnswerPairs(context).map((pair) => ({
        answer: pair.answer,
        score: Math.max(
          keywordOverlapScore(question, pair.question),
          keywordOverlapScore(question, `${pair.question} ${pair.answer}`),
        ),
      })),
    );

    qaCandidates.sort((a, b) => b.score - a.score);
    if (qaCandidates[0] && qaCandidates[0].score >= 0.45) {
      return qaCandidates[0].answer;
    }

    const bestContext = contexts
      .map((context) => ({
        context,
        score: keywordOverlapScore(question, context),
      }))
      .sort((a, b) => b.score - a.score)[0];

    if (!bestContext || bestContext.score < 0.45) {
      return 'CONTEXT_INSUFFICIENT.';
    }

    const plainText = bestContext.context.replace(/\s+/g, ' ').trim();
    return plainText.length <= 240
      ? plainText
      : `${plainText.slice(0, 237).trimEnd()}...`;
  }

  private fallbackEmbedding(text: string): number[] {
    const size = 64;
    const vec = new Array<number>(size).fill(0);

    for (let i = 0; i < text.length; i += 1) {
      const charCode = text.charCodeAt(i);
      const index = i % size;
      vec[index] += charCode / 255;
    }

    const digest = createHash('sha256').update(text).digest();
    for (let i = 0; i < size; i += 1) {
      vec[i] += digest[i % digest.length] / 255;
    }

    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0));
    if (norm === 0) {
      return vec;
    }

    return vec.map((v) => v / norm);
  }
}
