import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import { KnowledgeService } from './knowledge.service';
import { SupportArea } from '@prisma/client';

describe('KnowledgeService', () => {
  type KnowledgeChunkFindMany = PrismaService['knowledgeChunk']['findMany'];
  type FaqFindMany = PrismaService['faqEntry']['findMany'];
  type KnowledgeDocumentFindMany =
    PrismaService['knowledgeDocument']['findMany'];
  type Embed = GeminiService['embed'];

  const prisma = {
    knowledgeChunk: {
      findMany: jest.fn<
        ReturnType<KnowledgeChunkFindMany>,
        Parameters<KnowledgeChunkFindMany>
      >(),
      createMany: jest.fn(),
    },
    faqEntry: {
      findMany: jest.fn<ReturnType<FaqFindMany>, Parameters<FaqFindMany>>(),
      create: jest.fn(),
    },
    knowledgeDocument: {
      findMany: jest.fn<
        ReturnType<KnowledgeDocumentFindMany>,
        Parameters<KnowledgeDocumentFindMany>
      >(),
      create: jest.fn(),
    },
  };

  const geminiService = {
    embed: jest.fn<ReturnType<Embed>, Parameters<Embed>>(),
    isUsingLocalFallback: jest.fn(() => true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    geminiService.isUsingLocalFallback.mockReturnValue(true);
  });

  it('retrieves question-answer pairs from active documents', async () => {
    geminiService.embed.mockResolvedValue([1, 0, 0]);
    prisma.knowledgeChunk.findMany.mockResolvedValue([]);
    prisma.faqEntry.findMany.mockResolvedValue([]);
    prisma.knowledgeDocument.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'LIU Registration Quick Guide',
        content: [
          'Q: What is the Student Affairs email?',
          'A: student-affairs@liu.edu.lb',
        ].join('\n'),
      },
    ]);

    const service = new KnowledgeService(
      prisma as unknown as PrismaService,
      geminiService as unknown as GeminiService,
    );
    const contexts = await service.retrieveRelevant(
      'What is the Student Affairs email?',
      SupportArea.REGISTRATION,
    );

    expect(contexts).toHaveLength(1);
    expect(contexts[0]).toMatchObject({
      sourceId: 'doc-1',
      title: 'LIU Registration Quick Guide',
    });
    expect(contexts[0].text).toContain('student-affairs@liu.edu.lb');
    expect(contexts[0].score).toBeGreaterThanOrEqual(0.18);
  });

  it('returns no contexts when nothing is relevant', async () => {
    geminiService.embed.mockResolvedValue([1, 0, 0]);
    prisma.knowledgeChunk.findMany.mockResolvedValue([]);
    prisma.faqEntry.findMany.mockResolvedValue([]);
    prisma.knowledgeDocument.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'LIU Registration Quick Guide',
        content: 'Q: Does LIU teach in English?\nA: Yes.',
      },
    ]);

    const service = new KnowledgeService(
      prisma as unknown as PrismaService,
      geminiService as unknown as GeminiService,
    );
    const contexts = await service.retrieveRelevant(
      'How do I reset my Wi-Fi password?',
      SupportArea.REGISTRATION,
    );

    expect(contexts).toEqual([]);
  });

  it('does not retrieve contexts for random unrelated questions in local fallback mode', async () => {
    geminiService.embed.mockResolvedValue([0.9, 0.9, 0.9]);
    prisma.knowledgeChunk.findMany.mockResolvedValue([
      {
        chunkText:
          'Q: What if I already have qualifying coverage?\nA: You may need to submit an exemption form through the proper process.',
        embedding: [0.9, 0.9, 0.9],
        document: {
          id: 'doc-1',
          title: 'LIU Registration Quick Guide',
        },
      },
    ]);
    prisma.faqEntry.findMany.mockResolvedValue([]);
    prisma.knowledgeDocument.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'LIU Registration Quick Guide',
        content:
          'Q: What if I already have qualifying coverage?\nA: You may need to submit an exemption form through the proper process.',
      },
    ]);

    const service = new KnowledgeService(
      prisma as unknown as PrismaService,
      geminiService as unknown as GeminiService,
    );
    const contexts = await service.retrieveRelevant(
      'tell me about moon dragons',
      SupportArea.REGISTRATION,
    );

    expect(contexts).toEqual([]);
  });

  it('does not retrieve transfer-credit GPA context for a GPA calculation question', async () => {
    geminiService.embed.mockResolvedValue([1, 0, 0]);
    prisma.knowledgeChunk.findMany.mockResolvedValue([]);
    prisma.faqEntry.findMany.mockResolvedValue([]);
    prisma.knowledgeDocument.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'LIU Registration Quick Guide',
        content:
          'Q: Do transfer credits count in my LIU GPA?\nA: No. Accepted transfer credits generally do not count toward the LIU GPA.',
      },
    ]);

    const service = new KnowledgeService(
      prisma as unknown as PrismaService,
      geminiService as unknown as GeminiService,
    );
    const contexts = await service.retrieveRelevant(
      'how does GPA calculated',
      SupportArea.REGISTRATION,
    );

    expect(contexts).toEqual([]);
  });

  it('answers a GPA definition question from the direct GPA context only', async () => {
    geminiService.embed.mockResolvedValue([1, 0, 0]);
    prisma.knowledgeChunk.findMany.mockResolvedValue([]);
    prisma.faqEntry.findMany.mockResolvedValue([]);
    prisma.knowledgeDocument.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'LIU Registration Quick Guide',
        content: [
          'Q: Do transfer credits count in my LIU GPA?',
          'A: No. Accepted transfer credits generally do not count toward the LIU GPA.',
          '',
          'Q: What is GPA?',
          'A: GPA means Grade Point Average. It is a summary of a student academic performance based on course grades.',
        ].join('\n'),
      },
    ]);

    const service = new KnowledgeService(
      prisma as unknown as PrismaService,
      geminiService as unknown as GeminiService,
    );
    const contexts = await service.retrieveRelevant(
      'what is gpa',
      SupportArea.REGISTRATION,
    );

    expect(contexts).toHaveLength(1);
    expect(contexts[0].text).toContain('GPA means Grade Point Average');
    expect(contexts[0].text).not.toContain('transfer credits');
  });
});
