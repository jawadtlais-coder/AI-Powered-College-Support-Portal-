import { SupportArea } from '../common/enums';
import { OrchestratorService } from './orchestrator.service';

describe('OrchestratorService', () => {
  const service = new OrchestratorService();

  it('does not misclassify registration questions as IT because of "it" substrings', () => {
    expect(
      service.detectSupportArea('Do transfer credits count in my LIU GPA?'),
    ).toBe(SupportArea.REGISTRATION);

    expect(
      service.detectSupportArea('Who can help me with registration problems?'),
    ).toBe(SupportArea.REGISTRATION);
  });

  it('still detects real IT questions', () => {
    expect(service.detectSupportArea('How do I reset my Wi-Fi password?')).toBe(
      SupportArea.IT,
    );
  });

  it('detects common student IT support wording', () => {
    expect(service.detectSupportArea('I cannot sign in to my LIU email')).toBe(
      SupportArea.IT,
    );
    expect(service.detectSupportArea('My assignment upload failed')).toBe(
      SupportArea.IT,
    );
    expect(service.detectSupportArea('The portal shows an error message')).toBe(
      SupportArea.IT,
    );
    expect(service.detectSupportArea('I clicked a suspicious link')).toBe(
      SupportArea.IT,
    );
  });
});
