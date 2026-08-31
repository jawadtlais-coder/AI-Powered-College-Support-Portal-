import { Injectable } from '@nestjs/common';
import { AgentIntent, SupportArea } from '../common/enums';

@Injectable()
export class OrchestratorService {
  classifyIntent(message: string): AgentIntent {
    const lower = message.toLowerCase();
    const workflowSignals = [
      'ticket',
      'status',
      'open request',
      'create request',
      'escalate',
      'support request',
    ];
    const knowledgeSignals = [
      'where',
      'how',
      'what',
      'when',
      'who',
      'does',
      'can',
      'need',
      'policy',
      'document',
      'registration',
    ];

    const hasWorkflow = workflowSignals.some((signal) =>
      lower.includes(signal),
    );
    const hasKnowledge = knowledgeSignals.some((signal) =>
      lower.includes(signal),
    );

    if (hasWorkflow && hasKnowledge) {
      return AgentIntent.MIXED;
    }

    if (hasWorkflow) {
      return AgentIntent.WORKFLOW;
    }

    return AgentIntent.KNOWLEDGE;
  }

  detectSupportArea(message: string): SupportArea | undefined {
    const lower = message.toLowerCase();
    if (
      this.containsKeyword(lower, 'it') ||
      this.containsKeyword(lower, 'technical') ||
      this.containsKeyword(lower, 'technology') ||
      this.containsKeyword(lower, 'wifi') ||
      this.containsKeyword(lower, 'wi-fi') ||
      this.containsKeyword(lower, 'wireless') ||
      this.containsKeyword(lower, 'internet') ||
      this.containsKeyword(lower, 'network') ||
      this.containsKeyword(lower, 'password') ||
      this.containsKeyword(lower, 'credential') ||
      this.containsKeyword(lower, 'credentials') ||
      this.containsKeyword(lower, 'username') ||
      this.containsKeyword(lower, 'account') ||
      this.containsKeyword(lower, 'portal') ||
      this.containsKeyword(lower, 'login') ||
      lower.includes('log in') ||
      lower.includes('sign in') ||
      lower.includes('sign-in') ||
      lower.includes('locked account') ||
      lower.includes('disabled account') ||
      this.containsKeyword(lower, 'system') ||
      this.containsKeyword(lower, 'email') ||
      lower.includes('email access') ||
      this.containsKeyword(lower, 'mail') ||
      this.containsKeyword(lower, 'browser') ||
      this.containsKeyword(lower, 'cache') ||
      this.containsKeyword(lower, 'cookie') ||
      this.containsKeyword(lower, 'upload') ||
      this.containsKeyword(lower, 'download') ||
      this.containsKeyword(lower, 'assignment') ||
      this.containsKeyword(lower, 'exam') ||
      this.containsKeyword(lower, 'quiz') ||
      lower.includes('online course') ||
      lower.includes('learning platform') ||
      this.containsKeyword(lower, 'printer') ||
      this.containsKeyword(lower, 'scanner') ||
      this.containsKeyword(lower, 'projector') ||
      this.containsKeyword(lower, 'lab') ||
      this.containsKeyword(lower, 'computer') ||
      this.containsKeyword(lower, 'device') ||
      this.containsKeyword(lower, 'laptop') ||
      this.containsKeyword(lower, 'error') ||
      this.containsKeyword(lower, 'bug') ||
      this.containsKeyword(lower, 'phishing') ||
      lower.includes('suspicious link') ||
      lower.includes('suspicious email')
    ) {
      return SupportArea.IT;
    }

    if (
      this.containsKeyword(lower, 'registration') ||
      this.containsKeyword(lower, 'register') ||
      this.containsKeyword(lower, 'enroll') ||
      this.containsKeyword(lower, 'document') ||
      this.containsKeyword(lower, 'paper') ||
      this.containsKeyword(lower, 'admission') ||
      this.containsKeyword(lower, 'transfer') ||
      lower.includes('student affairs') ||
      lower.includes('graduat') ||
      this.containsKeyword(lower, 'clearance') ||
      this.containsKeyword(lower, 'nssf') ||
      lower.includes('social security') ||
      this.containsKeyword(lower, 'gpa') ||
      lower.includes('english proficiency')
    ) {
      return SupportArea.REGISTRATION;
    }

    return undefined;
  }

  private containsKeyword(message: string, keyword: string): boolean {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(message);
  }
}
