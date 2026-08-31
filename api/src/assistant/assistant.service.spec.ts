import { Role } from '@prisma/client';
import { SupportArea } from '../common/enums';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { WorkflowAgentService } from './workflow-agent.service';
import { OrchestratorService } from './orchestrator.service';
import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  const user = {
    userId: 'user-1',
    schoolId: '12345678',
    role: Role.STUDENT,
    supportArea: null,
    academicDepartment: null,
  };

  const knowledgeAgent = {
    answer: jest.fn(),
  };

  const workflowAgent = {
    handle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    knowledgeAgent.answer.mockResolvedValue({
      message: 'Try forgetting and reconnecting to the LIU Wi-Fi network.',
      confidence: 0.8,
      citations: [{ sourceId: 'doc-1', title: 'LIU IT Support Guide' }],
      missingContext: false,
    });
  });

  it('does not answer IT questions when registration is selected', async () => {
    const service = new AssistantService(
      knowledgeAgent as unknown as KnowledgeAgentService,
      workflowAgent as unknown as WorkflowAgentService,
      new OrchestratorService(),
    );

    const response = await service.message(user, {
      message: 'i have problem in liu wifi',
      supportArea: SupportArea.REGISTRATION,
    });

    expect(knowledgeAgent.answer).not.toHaveBeenCalled();
    expect(response.message).toContain(
      'This question appears to belong to IT Support',
    );
    expect(response.message).toContain(
      'Please switch the support area to IT Support',
    );
    expect(response.citations).toEqual([]);
  });

  it('answers IT questions when IT support is selected', async () => {
    const service = new AssistantService(
      knowledgeAgent as unknown as KnowledgeAgentService,
      workflowAgent as unknown as WorkflowAgentService,
      new OrchestratorService(),
    );

    await service.message(user, {
      message: 'i have problem in liu wifi',
      supportArea: SupportArea.IT,
    });

    expect(knowledgeAgent.answer).toHaveBeenCalledWith(
      'i have problem in liu wifi',
      SupportArea.IT,
    );
  });
});
