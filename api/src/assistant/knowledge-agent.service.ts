import { Injectable } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { GeminiService } from '../ai/gemini.service';
import { SupportArea } from '../common/enums';

@Injectable()
export class KnowledgeAgentService {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly geminiService: GeminiService,
  ) {}

  async answer(
    question: string,
    supportArea: SupportArea | null,
  ): Promise<{
    message: string;
    confidence: number;
    citations: Array<{ sourceId: string; title: string }>;
    missingContext: boolean;
  }> {
    const contexts = await this.knowledgeService.retrieveRelevant(
      question,
      supportArea,
      4,
    );

    if (contexts.length === 0) {
      return {
        message: 'I do not have trusted context for this question.',
        confidence: 0,
        citations: [],
        missingContext: true,
      };
    }

    const response = await this.geminiService.answerWithContext(
      question,
      contexts.map((item) => item.text),
      supportArea,
    );

    const confidence =
      contexts.reduce((sum, item) => sum + item.score, 0) / contexts.length;

    const normalized = response.trim();
    const missingContext =
      normalized === 'CONTEXT_INSUFFICIENT.' ||
      normalized.includes('CONTEXT_INSUFFICIENT');
    const citations = contexts.reduce<
      Array<{ sourceId: string; title: string }>
    >((acc, item) => {
      if (!acc.some((citation) => citation.sourceId === item.sourceId)) {
        acc.push({
          sourceId: item.sourceId,
          title: item.title,
        });
      }
      return acc;
    }, []);

    return {
      message: missingContext
        ? 'I could not find enough trusted context to answer safely.'
        : normalized,
      confidence,
      citations,
      missingContext,
    };
  }
}
