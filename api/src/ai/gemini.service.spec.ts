import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service';

describe('GeminiService local fallback', () => {
  const configService = {
    get: jest.fn(() => null),
  } as unknown as ConfigService;

  it('returns the matched answer from question and answer contexts', async () => {
    const service = new GeminiService(configService);

    const response = await service.answerWithContext(
      'What is the Student Affairs email?',
      [
        'Q: What is the Student Affairs email?\nA: student-affairs@liu.edu.lb',
        'Q: Does LIU teach in English?\nA: Yes.',
      ],
    );

    expect(response).toBe('student-affairs@liu.edu.lb');
  });

  it('returns CONTEXT_INSUFFICIENT for unrelated local contexts', async () => {
    const service = new GeminiService(configService);

    const response = await service.answerWithContext(
      'How do I reset my Wi-Fi password?',
      ['Q: What is the Student Affairs email?\nA: student-affairs@liu.edu.lb'],
    );

    expect(response).toBe('CONTEXT_INSUFFICIENT.');
  });

  it('returns CONTEXT_INSUFFICIENT instead of summarizing weakly related context', async () => {
    const service = new GeminiService(configService);

    const response = await service.answerWithContext(
      'tell me about moon dragons',
      [
        [
          'Q: What if I already have qualifying coverage?',
          'A: You may need to submit an exemption form through the proper process.',
          'If the question is about deadlines or special cases, verify with the campus office.',
        ].join('\n'),
      ],
    );

    expect(response).toBe('CONTEXT_INSUFFICIENT.');
  });

  it('returns CONTEXT_INSUFFICIENT when a question only shares GPA with transfer-credit context', async () => {
    const service = new GeminiService(configService);

    const response = await service.answerWithContext(
      'how does GPA calculated',
      [
        'Q: Do transfer credits count in my LIU GPA?\nA: No. Accepted transfer credits generally do not count toward the LIU GPA.',
      ],
    );

    expect(response).toBe('CONTEXT_INSUFFICIENT.');
  });

  it('matches common IT wording for portal access questions', async () => {
    const service = new GeminiService(configService);

    const response = await service.answerWithContext(
      'The portal is not opening',
      [
        [
          'Q: The LIU portal is not opening. What should I do?',
          'A: Check your internet connection, refresh the page, try a private window, clear cache for the portal site, disable browser extensions temporarily, and try another updated browser.',
        ].join('\n'),
      ],
    );

    expect(response).toContain('Check your internet connection');
  });

  it('matches Wi-Fi questions written without a hyphen', async () => {
    const service = new GeminiService(configService);

    const response = await service.answerWithContext(
      'What is the wifi password?',
      [
        [
          'Q: What is the LIU Wi-Fi password?',
          'A: The assistant cannot provide private or campus-specific Wi-Fi passwords. Ask your campus IT office, Student Affairs, or the relevant campus office for the official connection instructions.',
        ].join('\n'),
      ],
    );

    expect(response).toContain('cannot provide private');
  });
});
