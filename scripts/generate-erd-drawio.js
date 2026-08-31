#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const defaultOutPath = path.join(__dirname, '..', 'docs', 'entity-relationship-diagram.drawio');
const outPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultOutPath;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function entityHtml(title, fields) {
  const rows = fields
    .map((field) => {
      const tag = field.key ? `<b>${escapeXml(field.key)}</b> ` : '';
      const nullable = field.nullable ? ' <span style="color:#64748B;">NULL</span>' : '';
      const unique = field.unique ? ' <span style="color:#64748B;">UNIQUE</span>' : '';
      return `${tag}${escapeXml(field.name)}: ${escapeXml(field.type)}${nullable}${unique}<br/>`;
    })
    .join('');

  return [
    `<div style="text-align:center;font-size:14px;font-weight:700;">${escapeXml(title)}</div>`,
    '<hr/>',
    `<div style="line-height:1.45;">${rows}</div>`,
  ].join('');
}

function cell(id, value, style, x, y, width, height) {
  return `
        <mxCell id="${id}" value="${escapeXml(value)}" style="${style}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />
        </mxCell>`;
}

function entity(id, title, x, y, width, height, fields, fill = '#FFFFFF', stroke = '#111827') {
  return cell(
    id,
    entityHtml(title, fields),
    `rounded=0;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingTop=8;spacingLeft=10;spacingRight=10;spacingBottom=8;fillColor=${fill};strokeColor=${stroke};fontColor=#111827;fontSize=11;`,
    x,
    y,
    width,
    height,
  );
}

function note(id, text, x, y, width, height) {
  return cell(
    id,
    text,
    'shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#F8FAFC;strokeColor=#64748B;fontColor=#334155;fontSize=11;',
    x,
    y,
    width,
    height,
  );
}

function edge(id, source, target, label, startArrow, endArrow) {
  return `
        <mxCell id="${id}" value="${escapeXml(label)}" style="edgeStyle=entityRelationEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#111827;startArrow=${startArrow};startFill=0;endArrow=${endArrow};endFill=0;fontColor=#111827;fontSize=11;labelBackgroundColor=#FFFFFF;" edge="1" parent="1" source="${source}" target="${target}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;
}

const boxes = [
  cell(
    'title',
    'College Support Portal - Entity Relationship Diagram',
    'text;html=1;strokeColor=none;fillColor=none;align=center;fontStyle=1;fontSize=22;fontColor=#111827;',
    420,
    20,
    740,
    36,
  ),
  entity(
    'user',
    'users',
    560,
    95,
    360,
    300,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { name: 'schoolId', type: 'String', unique: true },
      { name: 'email', type: 'String', nullable: true, unique: true },
      { name: 'passwordHash', type: 'String' },
      { name: 'role', type: 'Role' },
      { name: 'supportArea', type: 'SupportArea', nullable: true },
      { name: 'academicDepartment', type: 'AcademicDepartment', nullable: true },
      { name: 'active', type: 'Boolean' },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'updatedAt', type: 'DateTime' },
    ],
    '#EFF6FF',
    '#1D4ED8',
  ),
  entity(
    'profile',
    'profiles',
    70,
    120,
    320,
    210,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { name: 'fullName', type: 'String' },
      { name: 'avatarUrl', type: 'String', nullable: true },
      { key: 'FK', name: 'userId', type: 'String', unique: true },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'updatedAt', type: 'DateTime' },
    ],
  ),
  entity(
    'notification',
    'notifications',
    1090,
    120,
    330,
    245,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { key: 'FK', name: 'userId', type: 'String' },
      { name: 'type', type: 'NotificationType' },
      { name: 'title', type: 'String' },
      { name: 'message', type: 'String' },
      { name: 'read', type: 'Boolean' },
      { name: 'createdAt', type: 'DateTime' },
    ],
  ),
  entity(
    'trace',
    'orchestrator_traces',
    70,
    445,
    340,
    250,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { key: 'FK', name: 'userId', type: 'String' },
      { name: 'intent', type: 'String' },
      { name: 'confidence', type: 'Float', nullable: true },
      { name: 'routedAgents', type: 'Json' },
      { name: 'outcome', type: 'Json' },
      { name: 'createdAt', type: 'DateTime' },
    ],
  ),
  entity(
    'apikey',
    'api_keys',
    1090,
    445,
    340,
    260,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { name: 'label', type: 'String' },
      { name: 'hashedKey', type: 'String', unique: true },
      { name: 'scopes', type: 'String[]' },
      { name: 'rateLimitPolicy', type: 'Json', nullable: true },
      { name: 'active', type: 'Boolean' },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'updatedAt', type: 'DateTime' },
    ],
    '#FFFBEB',
    '#D97706',
  ),
  entity(
    'ticket',
    'tickets',
    520,
    500,
    410,
    330,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { key: 'FK', name: 'studentId', type: 'String -> users.id' },
      { key: 'FK', name: 'assigneeId', type: 'String -> users.id', nullable: true },
      { name: 'supportArea', type: 'SupportArea' },
      { name: 'academicDepartment', type: 'AcademicDepartment', nullable: true },
      { name: 'subject', type: 'String' },
      { name: 'description', type: 'String' },
      { name: 'status', type: 'TicketStatus' },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'updatedAt', type: 'DateTime' },
    ],
    '#FFFFFF',
    '#1D4ED8',
  ),
  entity(
    'ticketEvent',
    'ticket_events',
    70,
    820,
    340,
    225,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { key: 'FK', name: 'ticketId', type: 'String -> tickets.id' },
      { key: 'FK', name: 'actorId', type: 'String -> users.id' },
      { name: 'eventType', type: 'String' },
      { name: 'payload', type: 'Json', nullable: true },
      { name: 'createdAt', type: 'DateTime' },
    ],
  ),
  entity(
    'attachment',
    'attachments',
    1090,
    805,
    340,
    270,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { key: 'FK', name: 'ticketId', type: 'String -> tickets.id' },
      { key: 'FK', name: 'uploaderId', type: 'String -> users.id' },
      { name: 'fileName', type: 'String' },
      { name: 'mimeType', type: 'String' },
      { name: 'sizeBytes', type: 'Int' },
      { name: 'storagePath', type: 'String' },
      { name: 'createdAt', type: 'DateTime' },
    ],
  ),
  entity(
    'knowledgeDocument',
    'knowledge_documents',
    520,
    950,
    410,
    295,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { name: 'title', type: 'String' },
      { name: 'supportArea', type: 'SupportArea' },
      { name: 'sourceType', type: 'KnowledgeSourceType' },
      { name: 'content', type: 'String' },
      { name: 'status', type: 'String' },
      { key: 'FK', name: 'uploadedBy', type: 'String -> users.id' },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'updatedAt', type: 'DateTime' },
    ],
    '#ECFDF5',
    '#059669',
  ),
  entity(
    'knowledgeChunk',
    'knowledge_chunks',
    70,
    1150,
    340,
    225,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { key: 'FK', name: 'documentId', type: 'String -> knowledge_documents.id' },
      { name: 'chunkText', type: 'String' },
      { name: 'embedding', type: 'Float[]' },
      { name: 'chunkIndex', type: 'Int' },
      { name: 'createdAt', type: 'DateTime' },
    ],
    '#F0FDF4',
    '#059669',
  ),
  entity(
    'faq',
    'faq_entries',
    1090,
    1170,
    340,
    225,
    [
      { key: 'PK', name: 'id', type: 'String' },
      { name: 'supportArea', type: 'SupportArea' },
      { name: 'question', type: 'String' },
      { name: 'answer', type: 'String' },
      { name: 'tags', type: 'String[]' },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'updatedAt', type: 'DateTime' },
    ],
    '#F0FDF4',
    '#059669',
  ),
  note(
    'legend',
    'Legend: PK = Primary Key, FK = Foreign Key. Student, Staff, and Admin are roles inside users.role, so they are not separate database tables.',
    560,
    1325,
    430,
    90,
  ),
];

const edges = [
  edge('eUserProfile', 'user', 'profile', 'has profile', 'ERone', 'ERzeroToOne'),
  edge('eUserNotification', 'user', 'notification', 'receives', 'ERone', 'ERzeroToMany'),
  edge('eUserTrace', 'user', 'trace', 'generates', 'ERone', 'ERzeroToMany'),
  edge('eStudentTicket', 'user', 'ticket', 'student creates', 'ERone', 'ERzeroToMany'),
  edge('eAssigneeTicket', 'user', 'ticket', 'assigned to', 'ERzeroToOne', 'ERzeroToMany'),
  edge('eTicketEvent', 'ticket', 'ticketEvent', 'logs', 'ERone', 'ERzeroToMany'),
  edge('eTicketEventActor', 'user', 'ticketEvent', 'actor', 'ERone', 'ERzeroToMany'),
  edge('eTicketAttachment', 'ticket', 'attachment', 'has', 'ERone', 'ERzeroToMany'),
  edge('eAttachmentUploader', 'user', 'attachment', 'uploads', 'ERone', 'ERzeroToMany'),
  edge('eUserDocument', 'user', 'knowledgeDocument', 'uploads', 'ERone', 'ERzeroToMany'),
  edge('eDocumentChunk', 'knowledgeDocument', 'knowledgeChunk', 'splits into', 'ERone', 'ERzeroToMany'),
];

const xml = `<mxfile host="Electron" agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) draw.io/29.6.1 Chrome/142.0.7444.265 Electron/39.8.0 Safari/537.36" compressed="false" version="29.6.1">
  <diagram id="erd-page" name="Entity Relationship Diagram">
    <mxGraphModel dx="1550" dy="1450" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1550" pageHeight="1450" background="#ffffff" math="0" shadow="0">
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
