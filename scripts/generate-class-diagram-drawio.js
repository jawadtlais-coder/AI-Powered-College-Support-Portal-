#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const defaultOutPath = path.join(__dirname, '..', 'docs', 'class-diagram.drawio');
const outPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultOutPath;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function classHtml(title, attributes = [], methods = []) {
  const attrLines = attributes.map((line) => `${escapeXml(line)}<br/>`).join('');
  const methodLines = methods.map((line) => `${escapeXml(line)}<br/>`).join('');

  return [
    `<div style="text-align:center;font-size:14px;font-weight:700;">${escapeXml(title)}</div>`,
    '<hr/>',
    `<div style="line-height:1.45;">${attrLines}</div>`,
    methods.length ? '<hr/>' : '',
    methods.length ? `<div style="line-height:1.45;">${methodLines}</div>` : '',
  ].join('');
}

function box(id, title, x, y, w, h, fill, stroke, attributes, methods) {
  return `
        <mxCell id="${id}" value="${escapeXml(classHtml(title, attributes, methods))}" style="rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingTop=8;spacingLeft=10;spacingRight=10;spacingBottom=8;fillColor=${fill};strokeColor=${stroke};fontColor=#111827;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
        </mxCell>`;
}

function enumBox(id, title, x, y, w, h, values) {
  return box(id, `<<enumeration>> ${title}`, x, y, w, h, '#F8FAFC', '#64748B', values, []);
}

function note(id, value, x, y, w, h) {
  return `
        <mxCell id="${id}" value="${escapeXml(value).replace(/\n/g, '&lt;br/&gt;')}" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#FEF3C7;strokeColor=#D97706;fontColor=#111827;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" />
        </mxCell>`;
}

function edge(id, source, target, value, style, points = '') {
  return `
        <mxCell id="${id}" value="${escapeXml(value)}" style="${style}" edge="1" parent="1" source="${source}" target="${target}">
          <mxGeometry relative="1" as="geometry">${points}</mxGeometry>
        </mxCell>`;
}

const styles = {
  inheritance:
    'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#475569;endArrow=block;endFill=0;endSize=18;',
  association:
    'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#475569;endArrow=classic;endFill=1;',
  dependency:
    'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#64748B;endArrow=open;endFill=0;dashed=1;',
};

const boxes = [
  box(
    'user',
    'User',
    420,
    40,
    340,
    300,
    '#EFF6FF',
    '#1D4ED8',
    [
      '- id: String',
      '- schoolId: String',
      '- email: String?',
      '- passwordHash: String',
      '- role: Role',
      '- supportArea: SupportArea?',
      '- academicDepartment: AcademicDepartment?',
      '- active: Boolean',
      '- createdAt: DateTime',
      '- updatedAt: DateTime',
    ],
    ['+ login()', '+ logout()', '+ viewProfile()', '+ updateProfile()'],
  ),
  box(
    'profile',
    'Profile',
    40,
    55,
    300,
    205,
    '#FFFFFF',
    '#1D4ED8',
    ['- id: String', '- fullName: String', '- avatarUrl: String?', '- userId: String', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ viewProfile()', '+ updateProfile()'],
  ),
  box(
    'notification',
    'Notification',
    840,
    55,
    320,
    220,
    '#FFFFFF',
    '#1D4ED8',
    ['- id: String', '- userId: String', '- type: NotificationType', '- title: String', '- message: String', '- read: Boolean', '- createdAt: DateTime'],
    ['+ createMany()', '+ getUnreadCount()'],
  ),
  box(
    'trace',
    'OrchestratorTrace',
    1240,
    55,
    340,
    230,
    '#FFFFFF',
    '#1D4ED8',
    ['- id: String', '- userId: String', '- intent: String', '- confidence: Float?', '- routedAgents: Json', '- outcome: Json', '- createdAt: DateTime'],
    ['+ recordTrace()', '+ viewTraces()'],
  ),
  box(
    'apikey',
    'ApiKey',
    1660,
    55,
    340,
    230,
    '#FFFBEB',
    '#D97706',
    ['- id: String', '- label: String', '- hashedKey: String', '- scopes: String[]', '- rateLimitPolicy: Json?', '- active: Boolean', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ createApiKey()', '+ validateKey()', '+ deactivate()'],
  ),
  box(
    'student',
    'Student',
    80,
    410,
    300,
    220,
    '#FFFFFF',
    '#2563EB',
    ['- role: Role = STUDENT', '- academicDepartment: AcademicDepartment'],
    ['+ register()', '+ createTicket()', '+ viewMyTickets()', '+ updateOwnTicket()', '+ addAttachment()', '+ removeAttachment()'],
  ),
  box(
    'staff',
    'Staff',
    460,
    410,
    300,
    220,
    '#FFFFFF',
    '#2563EB',
    ['- role: Role = STAFF', '- supportArea: SupportArea'],
    ['+ listQueue()', '+ viewTicket()', '+ claimTicket()', '+ updateTicket()', '+ updateTicketStatus()'],
  ),
  box(
    'admin',
    'Admin',
    840,
    410,
    320,
    250,
    '#FFFFFF',
    '#2563EB',
    ['- role: Role = ADMIN', '- supportArea: SupportArea?', '- academicDepartment: AcademicDepartment?'],
    ['+ provisionUser()', '+ updateUserRouting()', '+ createApiKey()', '+ viewTraces()', '+ manageFaq()', '+ uploadKnowledgeDocument()'],
  ),
  box(
    'ticket',
    'Ticket',
    80,
    780,
    360,
    320,
    '#FFFFFF',
    '#1D4ED8',
    ['- id: String', '- studentId: String', '- supportArea: SupportArea', '- academicDepartment: AcademicDepartment?', '- subject: String', '- description: String', '- status: TicketStatus', '- assigneeId: String?', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ createTicket()', '+ getTicketById()', '+ claimTicket()', '+ updateStatus()', '+ updateTicket()'],
  ),
  box(
    'ticketEvent',
    'TicketEvent',
    520,
    780,
    300,
    210,
    '#FFFFFF',
    '#64748B',
    ['- id: String', '- ticketId: String', '- actorId: String', '- eventType: String', '- payload: Json?', '- createdAt: DateTime'],
    ['+ logEvent()'],
  ),
  box(
    'attachment',
    'Attachment',
    900,
    780,
    320,
    245,
    '#FFFFFF',
    '#64748B',
    ['- id: String', '- ticketId: String', '- uploaderId: String', '- fileName: String', '- mimeType: String', '- sizeBytes: Int', '- storagePath: String', '- createdAt: DateTime'],
    ['+ addAttachment()', '+ removeAttachment()', '+ validateAttachment()'],
  ),
  box(
    'knowledgeDocument',
    'KnowledgeDocument',
    1320,
    760,
    360,
    300,
    '#ECFDF5',
    '#059669',
    ['- id: String', '- title: String', '- supportArea: SupportArea', '- sourceType: KnowledgeSourceType', '- content: String', '- status: String', '- uploadedBy: String', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ createDocument()', '+ search()', '+ retrieveRelevant()'],
  ),
  box(
    'knowledgeChunk',
    'KnowledgeChunk',
    1740,
    790,
    320,
    210,
    '#F0FDF4',
    '#059669',
    ['- id: String', '- documentId: String', '- chunkText: String', '- embedding: Float[]', '- chunkIndex: Int', '- createdAt: DateTime'],
    ['+ generateEmbedding()'],
  ),
  box(
    'faq',
    'FaqEntry',
    1320,
    1130,
    360,
    220,
    '#F0FDF4',
    '#059669',
    ['- id: String', '- supportArea: SupportArea', '- question: String', '- answer: String', '- tags: String[]', '- createdAt: DateTime', '- updatedAt: DateTime'],
    ['+ createFaq()', '+ search()'],
  ),
  box(
    'authService',
    'AuthService',
    80,
    1450,
    300,
    205,
    '#F5F3FF',
    '#7C3AED',
    ['- prisma: PrismaService', '- jwtService: JwtService'],
    ['+ registerStudent()', '+ provisionUser()', '+ login()', '- signToken()'],
  ),
  box(
    'usersService',
    'UsersService',
    440,
    1450,
    280,
    175,
    '#F5F3FF',
    '#7C3AED',
    ['- prisma: PrismaService'],
    ['+ me()', '+ updateProfile()'],
  ),
  box(
    'ticketsService',
    'TicketsService',
    780,
    1450,
    340,
    260,
    '#F5F3FF',
    '#7C3AED',
    ['- prisma: PrismaService', '- mailService: MailService', '- notificationsService: NotificationsService'],
    ['+ createTicket()', '+ listMyTickets()', '+ listQueue()', '+ claim()', '+ updateStatus()', '+ updateTicket()', '+ addAttachment()', '+ removeAttachment()', '+ createMessage()'],
  ),
  box(
    'knowledgeService',
    'KnowledgeService',
    1200,
    1450,
    330,
    220,
    '#F5F3FF',
    '#7C3AED',
    ['- prisma: PrismaService', '- geminiService: GeminiService'],
    ['+ createFaq()', '+ createDocument()', '+ search()', '+ retrieveRelevant()'],
  ),
  box(
    'assistantService',
    'AssistantService',
    1600,
    1450,
    340,
    225,
    '#FEF2F2',
    '#DC2626',
    ['- orchestrator: OrchestratorService', '- knowledgeAgent: KnowledgeAgentService', '- workflowAgent: WorkflowAgentService', '- prisma: PrismaService'],
    ['+ message()'],
  ),
  box(
    'orchestratorService',
    'OrchestratorService',
    80,
    1810,
    300,
    170,
    '#FEF2F2',
    '#DC2626',
    [],
    ['+ classifyIntent()', '+ detectSupportArea()'],
  ),
  box(
    'knowledgeAgentService',
    'KnowledgeAgentService',
    440,
    1810,
    320,
    185,
    '#FEF2F2',
    '#DC2626',
    ['- knowledgeService: KnowledgeService', '- geminiService: GeminiService'],
    ['+ answer()'],
  ),
  box(
    'workflowAgentService',
    'WorkflowAgentService',
    820,
    1810,
    300,
    170,
    '#FEF2F2',
    '#DC2626',
    ['- ticketsService: TicketsService'],
    ['+ handle()'],
  ),
  box(
    'notificationsService',
    'NotificationsService',
    1180,
    1810,
    300,
    175,
    '#F5F3FF',
    '#7C3AED',
    ['- prisma: PrismaService'],
    ['+ createMany()', '+ getUnreadCount()'],
  ),
  box(
    'geminiService',
    'GeminiService',
    1540,
    1810,
    300,
    185,
    '#F5F3FF',
    '#7C3AED',
    ['- apiKey: string?', '- modelName: string', '- embeddingModel: string'],
    ['+ embed()', '+ answerWithContext()'],
  ),
  box(
    'mailService',
    'MailService',
    1900,
    1810,
    280,
    175,
    '#F5F3FF',
    '#7C3AED',
    ['- transporter: Transporter?'],
    ['+ sendMail()'],
  ),
  box(
    'prismaService',
    'PrismaService',
    80,
    2140,
    300,
    160,
    '#EEF2FF',
    '#4F46E5',
    ['extends PrismaClient'],
    ['+ onModuleInit()', '+ onModuleDestroy()'],
  ),
  enumBox('roleEnum', 'Role', 500, 2140, 240, 160, ['STUDENT', 'STAFF', 'ADMIN']),
  enumBox('supportAreaEnum', 'SupportArea', 800, 2140, 240, 145, ['REGISTRATION', 'IT']),
  enumBox('academicDepartmentEnum', 'AcademicDepartment', 1100, 2140, 260, 175, ['ENGINEERING', 'BUSINESS', 'LAW', 'MEDICINE']),
  enumBox('ticketStatusEnum', 'TicketStatus', 1420, 2140, 240, 160, ['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  enumBox('notificationTypeEnum', 'NotificationType', 1720, 2140, 260, 160, ['TICKET_CREATED', 'TICKET_UPDATED', 'SYSTEM']),
  enumBox('knowledgeSourceTypeEnum', 'KnowledgeSourceType', 2040, 2140, 240, 130, ['FAQ', 'DOCUMENT']),
  enumBox('agentIntentEnum', 'AgentIntent', 2040, 2320, 240, 145, ['KNOWLEDGE', 'WORKFLOW', 'MIXED']),
  note(
    'roleNote',
    'Student, Staff, and Admin are role-based specializations of User. In Prisma they are stored in the same User table using User.role.',
    1240,
    410,
    360,
    115,
  ),
  note(
    'namingNote',
    'Prisma field name is supportArea. It is mapped to the database column/table label "department", so the diagram uses SupportArea to match the code.',
    1640,
    410,
    360,
    130,
  ),
];

const edges = [
  edge('eUserProfile', 'user', 'profile', '1 has 0..1', styles.association),
  edge('eUserNotification', 'user', 'notification', '1 receives 0..*', styles.association),
  edge('eUserTrace', 'user', 'trace', '1 creates 0..*', styles.association),
  edge('eUserApiKey', 'admin', 'apikey', 'creates 0..*', styles.association),
  edge('eStudentUser', 'student', 'user', '', styles.inheritance),
  edge('eStaffUser', 'staff', 'user', '', styles.inheritance),
  edge('eAdminUser', 'admin', 'user', '', styles.inheritance),
  edge('eStudentTicket', 'student', 'ticket', '1 creates 0..*', styles.association),
  edge('eStaffTicket', 'staff', 'ticket', '0..1 assigned to 0..*', styles.association),
  edge('eTicketEvent', 'ticket', 'ticketEvent', '1 logs 0..*', styles.association),
  edge('eTicketAttachment', 'ticket', 'attachment', '1 has 0..*', styles.association),
  edge('eTicketEventActor', 'ticketEvent', 'user', 'actor', styles.association),
  edge('eAttachmentUser', 'attachment', 'user', 'uploaded by', styles.association),
  edge('eUserDocument', 'user', 'knowledgeDocument', 'uploads 0..*', styles.association),
  edge('eDocumentChunk', 'knowledgeDocument', 'knowledgeChunk', '1 splits into 0..*', styles.association),
  edge('eAdminDocument', 'admin', 'knowledgeDocument', 'manages', styles.association),
  edge('eAdminFaq', 'admin', 'faq', 'manages', styles.association),
  edge('eAuthUser', 'authService', 'user', 'creates/authenticates', styles.dependency),
  edge('eUsersProfile', 'usersService', 'profile', 'updates', styles.dependency),
  edge('eTicketsTicket', 'ticketsService', 'ticket', 'manages', styles.dependency),
  edge('eTicketsNotify', 'ticketsService', 'notificationsService', 'uses', styles.dependency),
  edge('eTicketsMail', 'ticketsService', 'mailService', 'uses', styles.dependency),
  edge('eKnowledgeDoc', 'knowledgeService', 'knowledgeDocument', 'manages', styles.dependency),
  edge('eKnowledgeFaq', 'knowledgeService', 'faq', 'manages', styles.dependency),
  edge('eKnowledgeGemini', 'knowledgeService', 'geminiService', 'uses embeddings', styles.dependency),
  edge('eAssistantOrchestrator', 'assistantService', 'orchestratorService', 'routes', styles.dependency),
  edge('eAssistantKnowledgeAgent', 'assistantService', 'knowledgeAgentService', 'delegates', styles.dependency),
  edge('eAssistantWorkflowAgent', 'assistantService', 'workflowAgentService', 'delegates', styles.dependency),
  edge('eAssistantTrace', 'assistantService', 'trace', 'records', styles.dependency),
  edge('eKnowledgeAgentKnowledge', 'knowledgeAgentService', 'knowledgeService', 'retrieves context', styles.dependency),
  edge('eKnowledgeAgentGemini', 'knowledgeAgentService', 'geminiService', 'answers', styles.dependency),
  edge('eWorkflowAgentTickets', 'workflowAgentService', 'ticketsService', 'creates tickets', styles.dependency),
  edge('eNotificationsModel', 'notificationsService', 'notification', 'manages', styles.dependency),
  edge('ePrismaAuth', 'authService', 'prismaService', 'uses', styles.dependency),
  edge('ePrismaUsers', 'usersService', 'prismaService', 'uses', styles.dependency),
  edge('ePrismaTickets', 'ticketsService', 'prismaService', 'uses', styles.dependency),
  edge('ePrismaKnowledge', 'knowledgeService', 'prismaService', 'uses', styles.dependency),
  edge('ePrismaAssistant', 'assistantService', 'prismaService', 'uses', styles.dependency),
  edge('ePrismaNotifications', 'notificationsService', 'prismaService', 'uses', styles.dependency),
  edge('eUserRole', 'user', 'roleEnum', 'role', styles.dependency),
  edge('eUserSupportArea', 'user', 'supportAreaEnum', 'supportArea', styles.dependency),
  edge('eUserAcademicDepartment', 'user', 'academicDepartmentEnum', 'academicDepartment', styles.dependency),
  edge('eTicketStatus', 'ticket', 'ticketStatusEnum', 'status', styles.dependency),
  edge('eTicketSupportArea', 'ticket', 'supportAreaEnum', 'supportArea', styles.dependency),
  edge('eTicketAcademicDepartment', 'ticket', 'academicDepartmentEnum', 'academicDepartment', styles.dependency),
  edge('eNotificationType', 'notification', 'notificationTypeEnum', 'type', styles.dependency),
  edge('eDocumentSourceType', 'knowledgeDocument', 'knowledgeSourceTypeEnum', 'sourceType', styles.dependency),
  edge('eOrchestratorIntent', 'orchestratorService', 'agentIntentEnum', 'returns', styles.dependency),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-04-19T00:00:00.000Z" agent="Codex" version="29.6.1" editor="www.draw.io" compressed="false">
  <diagram id="class-diagram-page" name="Class Diagram">
    <mxGraphModel dx="2290" dy="2470" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2350" pageHeight="2550" background="#ffffff" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />${boxes.join('')}${edges.join('')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, xml, 'utf8');
console.log(`Generated ${outPath}`);
