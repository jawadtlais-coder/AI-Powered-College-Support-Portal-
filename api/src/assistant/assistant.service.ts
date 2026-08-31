import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AcademicDepartment, AgentIntent, SupportArea } from '../common/enums';
import { AssistantMessageDto } from './dto/assistant-message.dto';
import { AssistantResponse } from './types';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { WorkflowAgentService } from './workflow-agent.service';
import { OrchestratorService } from './orchestrator.service';

@Injectable()
export class AssistantService {
  private readonly confidenceThreshold = 0.35;

  constructor(
    private readonly knowledgeAgent: KnowledgeAgentService,
    private readonly workflowAgent: WorkflowAgentService,
    private readonly orchestrator: OrchestratorService,
  ) {}

  async message(
    user: {
      userId: string;
      schoolId: string;
      role: Role;
      supportArea: SupportArea | null;
      academicDepartment: AcademicDepartment | null;
    },
    dto: AssistantMessageDto,
  ): Promise<AssistantResponse> {
    const intent = this.orchestrator.classifyIntent(dto.message);
    const canCreateTicket = user.role === Role.STUDENT;
    const routedAgents: string[] = [];

    let message = '';
    let confidence: number | undefined;
    let citations: Array<{ sourceId: string; title: string }> = [];
    let ticketId: string | undefined;
    const detectedSupportArea = this.orchestrator.detectSupportArea(dto.message);
    const hasSelectedAreaMismatch =
      Boolean(dto.supportArea) &&
      Boolean(detectedSupportArea) &&
      dto.supportArea !== detectedSupportArea;
    const supportArea = dto.supportArea ?? user.supportArea ?? detectedSupportArea ?? null;

    if (hasSelectedAreaMismatch && dto.supportArea && detectedSupportArea) {
      return {
        intent,
        message: `This question appears to belong to ${this.formatSupportArea(detectedSupportArea)}, but ${this.formatSupportArea(dto.supportArea)} is selected. Please switch the support area to ${this.formatSupportArea(detectedSupportArea)} so I can answer from the correct knowledge base.`,
        citations: [],
      };
    }

    if (intent === AgentIntent.KNOWLEDGE || intent === AgentIntent.MIXED) {
      routedAgents.push('KnowledgeAgent');
      const knowledgeResult = await this.knowledgeAgent.answer(
        dto.message,
        supportArea,
      );
      confidence = knowledgeResult.confidence;
      citations = knowledgeResult.citations;

      if (
        knowledgeResult.missingContext ||
        knowledgeResult.confidence < this.confidenceThreshold
      ) {
        if (dto.createTicketOnDecline && canCreateTicket) {
          routedAgents.push('WorkflowAgent');
          const workflowResult = await this.workflowAgent.handle(user, {
            ...dto,
            supportArea: supportArea ?? SupportArea.IT,
            subject: dto.subject ?? this.buildEscalationSubject(dto.message),
            description: this.buildEscalationDescription(
              dto.message,
              knowledgeResult.confidence,
              dto.description,
            ),
          });

          message = `I could not answer from trusted sources, so I escalated this to staff. ${workflowResult.message}`;
          ticketId = workflowResult.ticketId;
        } else {
          message = canCreateTicket
            ? 'I could not find enough trusted context to answer safely. Do you want me to create a support ticket?'
            : 'I could not find enough trusted context to answer safely. Staff and admins can still use the assistant, check ticket status, and manage the ticket queue, but only students can submit new tickets.';
        }
      } else {
        message = knowledgeResult.message;
      }
    }

    if (intent === AgentIntent.WORKFLOW) {
      routedAgents.push('WorkflowAgent');
      const workflowResult = await this.workflowAgent.handle(user, {
        ...dto,
        supportArea: supportArea ?? dto.supportArea,
      });
      message = workflowResult.message;
      ticketId = workflowResult.ticketId;
    }

    if (
      intent === AgentIntent.MIXED &&
      !ticketId &&
      dto.message.toLowerCase().includes('ticket')
    ) {
      routedAgents.push('WorkflowAgent');
      const workflowResult = await this.workflowAgent.handle(user, {
        ...dto,
        supportArea: supportArea ?? dto.supportArea,
      });
      message = `${message}\n\n${workflowResult.message}`;
      ticketId = workflowResult.ticketId;
    }

    return {
      intent,
      message,
      confidence,
      citations,
      ticketSuggestion:
        canCreateTicket &&
        message.includes('Do you want me to create a support ticket')
          ? {
              allowed: true,
              reason: 'No trusted context found.',
            }
          : undefined,
      ...(ticketId ? { ticketId } : {}),
    };
  }

  private buildEscalationSubject(message: string): string {
    const normalized = message.trim().replace(/\s+/g, ' ');
    const prefix = 'Unanswered question';

    if (!normalized) {
      return prefix;
    }

    const maxQuestionLength = 60 - prefix.length - 2;
    const question =
      normalized.length <= maxQuestionLength
        ? normalized
        : `${normalized.slice(0, maxQuestionLength - 3).trimEnd()}...`;

    return `${prefix}: ${question}`;
  }

  private buildEscalationDescription(
    question: string,
    confidence: number,
    additionalDetails?: string,
  ): string {
    const normalizedQuestion = question.trim();
    const normalizedDetails = additionalDetails?.trim();
    const lines = [
      'The assistant could not answer this question from trusted knowledge.',
      '',
      `Original unanswered question: ${normalizedQuestion}`,
      '',
      `Assistant confidence: ${confidence.toFixed(2)}`,
      'Reason: Missing or low-confidence trusted context.',
    ];

    if (
      normalizedDetails &&
      normalizedDetails.toLowerCase() !== normalizedQuestion.toLowerCase()
    ) {
      lines.push('', `Additional student details: ${normalizedDetails}`);
    }

    return lines.join('\n');
  }

  private formatSupportArea(supportArea: SupportArea): string {
    return supportArea === SupportArea.IT ? 'IT Support' : 'Registration';
  }
}
