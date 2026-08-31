#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const defaultOutPath = path.join(__dirname, '..', 'docs', 'activity-diagram-roles.drawio');
const outPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultOutPath;

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cell(id, value, style, x, y, width, height, extra = '') {
  return `
        <mxCell id="${id}" value="${escapeXml(value)}" style="${style}" vertex="1" parent="1"${extra}>
          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />
        </mxCell>`;
}

function lane(id, title, x, y, width, height, fill = '#F8FAFC') {
  return cell(
    id,
    title,
    `swimlane;horizontal=1;startSize=34;whiteSpace=wrap;html=1;rounded=0;fillColor=${fill};strokeColor=#CBD5E1;fontColor=#111827;fontStyle=1;`,
    x,
    y,
    width,
    height,
  );
}

function action(id, text, x, y, width = 240, height = 58, fill = '#DBEAFE', stroke = '#2563EB') {
  return cell(
    id,
    text,
    `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=#111827;fontSize=12;spacing=8;`,
    x,
    y,
    width,
    height,
  );
}

function decision(id, text, x, y, width = 150, height = 90) {
  return cell(
    id,
    text,
    'rhombus;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;fontColor=#111827;fontSize=11;spacing=8;',
    x,
    y,
    width,
    height,
  );
}

function start(id, x, y) {
  return cell(id, '', 'ellipse;html=1;shape=startState;fillColor=#111827;strokeColor=#111827;', x, y, 32, 32);
}

function end(id, x, y) {
  return cell(id, '', 'ellipse;html=1;shape=endState;fillColor=#FFFFFF;strokeColor=#111827;', x, y, 34, 34);
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

function edge(id, source, target, label = '', points = '') {
  return `
        <mxCell id="${id}" value="${escapeXml(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#475569;endArrow=block;endFill=1;fontSize=11;" edge="1" parent="1" source="${source}" target="${target}">
          <mxGeometry relative="1" as="geometry">${points}</mxGeometry>
        </mxCell>`;
}

function diagram(id, name, pageWidth, pageHeight, cells) {
  return `
  <diagram id="${id}" name="${escapeXml(name)}">
    <mxGraphModel dx="${pageWidth}" dy="${pageHeight}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" background="#ffffff" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />${cells.join('')}
      </root>
    </mxGraphModel>
  </diagram>`;
}

function studentDiagram() {
  const cells = [
    lane('studentLane', 'Student', 40, 40, 420, 980, '#EFF6FF'),
    lane('systemLane', 'College Support System', 460, 40, 520, 980, '#F8FAFC'),
    start('sStart', 234, 90),
    action('sOpen', 'Open College Support app', 130, 150),
    action('sLogin', 'Login or register', 130, 235),
    action('sysAuth', 'Validate credentials and load profile', 600, 235, 260),
    decision('sChoice', 'What does the student need?', 175, 340),
    action('sAskAi', 'Ask AI assistant or search knowledge base', 92, 475, 280),
    action('sysAnswer', 'Classify intent, search FAQ/documents, return answer', 565, 475, 330, 70),
    decision('sSolved', 'Answer solved issue?', 175, 610),
    action('sCreateTicket', 'Create support ticket and add attachment if needed', 80, 745, 300, 70),
    action('sysTicket', 'Validate ticket, choose support area, save ticket, notify staff', 560, 745, 340, 80),
    action('sTrack', 'Track ticket and receive notifications', 100, 880, 260),
    end('sEnd', 227, 958),
    note(
      'sNote',
      'This diagram shows behavior. Keep classes such as Ticket, Notification, and User in the class diagram.',
      610,
      885,
      300,
      75,
    ),
    edge('se1', 'sStart', 'sOpen'),
    edge('se2', 'sOpen', 'sLogin'),
    edge('se3', 'sLogin', 'sysAuth'),
    edge('se4', 'sysAuth', 'sChoice'),
    edge('se5', 'sChoice', 'sAskAi', 'Ask question'),
    edge('se6', 'sAskAi', 'sysAnswer'),
    edge('se7', 'sysAnswer', 'sSolved'),
    edge('se8', 'sSolved', 'sEnd', 'Yes'),
    edge('se9', 'sSolved', 'sCreateTicket', 'No'),
    edge('se10', 'sChoice', 'sCreateTicket', 'Needs service'),
    edge('se11', 'sCreateTicket', 'sysTicket'),
    edge('se12', 'sysTicket', 'sTrack'),
    edge('se13', 'sTrack', 'sEnd'),
  ];

  return diagram('student-activity', 'Student Activity', 1020, 1080, cells);
}

function staffDiagram() {
  const cells = [
    lane('staffLane', 'Staff', 40, 40, 420, 980, '#ECFDF5'),
    lane('systemLane', 'College Support System', 460, 40, 520, 980, '#F8FAFC'),
    start('stStart', 234, 90),
    action('stLogin', 'Login as staff', 130, 155),
    action('sysStaffAuth', 'Validate role and load assigned support area', 585, 155, 310),
    action('stQueue', 'Open ticket queue', 130, 260),
    action('sysQueue', 'Return open and in-progress tickets for support area', 560, 260, 340, 70),
    action('stClaim', 'Review ticket and claim it', 120, 390, 260),
    action('sysAssign', 'Assign staff member and log ticket event', 590, 390, 300),
    action('stWork', 'Add reply, request details, or attach file', 105, 520, 290),
    action('sysNotifyStudent', 'Save update and notify student', 610, 520, 260),
    decision('stResolved', 'Can ticket be resolved?', 172, 650),
    action('stUpdate', 'Update status to IN_PROGRESS', 105, 790, 290),
    action('stResolve', 'Update status to RESOLVED', 105, 900, 290),
    action('sysStatus', 'Save status, log event, send notification', 585, 845, 310, 70),
    end('stEnd', 227, 970),
    edge('ste1', 'stStart', 'stLogin'),
    edge('ste2', 'stLogin', 'sysStaffAuth'),
    edge('ste3', 'sysStaffAuth', 'stQueue'),
    edge('ste4', 'stQueue', 'sysQueue'),
    edge('ste5', 'sysQueue', 'stClaim'),
    edge('ste6', 'stClaim', 'sysAssign'),
    edge('ste7', 'sysAssign', 'stWork'),
    edge('ste8', 'stWork', 'sysNotifyStudent'),
    edge('ste9', 'sysNotifyStudent', 'stResolved'),
    edge('ste10', 'stResolved', 'stResolve', 'Yes'),
    edge('ste11', 'stResolved', 'stUpdate', 'No'),
    edge('ste12', 'stUpdate', 'sysStatus'),
    edge('ste13', 'stResolve', 'sysStatus'),
    edge('ste14', 'sysStatus', 'stEnd'),
  ];

  return diagram('staff-activity', 'Staff Activity', 1020, 1080, cells);
}

function adminDiagram() {
  const cells = [
    lane('adminLane', 'Admin', 40, 40, 420, 1040, '#FFFBEB'),
    lane('systemLane', 'College Support System', 460, 40, 520, 1040, '#F8FAFC'),
    start('aStart', 234, 90),
    action('aLogin', 'Login as admin', 130, 155),
    action('sysAdminAuth', 'Validate admin role and permissions', 590, 155, 300),
    decision('aTask', 'Choose admin task', 175, 275),
    action('aUsers', 'Provision user or update role/routing', 95, 420, 290),
    action('sysUsers', 'Create/update user, profile, support area, and department', 555, 420, 350, 75),
    action('aKnowledge', 'Create FAQ or upload knowledge document', 90, 555, 300),
    action('sysKnowledge', 'Store content, split document, generate embeddings', 570, 555, 320, 75),
    action('aApi', 'Create or deactivate API key', 110, 690, 260),
    action('sysApi', 'Hash key, save scopes, apply rate limit policy', 575, 690, 310, 75),
    action('aTrace', 'View orchestrator traces and reports', 105, 825, 290),
    action('sysTrace', 'Load trace history, routed agents, confidence, and outcome', 550, 825, 360, 75),
    action('aConfirm', 'Confirm changes or continue administration', 92, 960, 300),
    end('aEnd', 227, 1030),
    edge('ae1', 'aStart', 'aLogin'),
    edge('ae2', 'aLogin', 'sysAdminAuth'),
    edge('ae3', 'sysAdminAuth', 'aTask'),
    edge('ae4', 'aTask', 'aUsers', 'Users'),
    edge('ae5', 'aUsers', 'sysUsers'),
    edge('ae6', 'sysUsers', 'aConfirm'),
    edge('ae7', 'aTask', 'aKnowledge', 'Knowledge'),
    edge('ae8', 'aKnowledge', 'sysKnowledge'),
    edge('ae9', 'sysKnowledge', 'aConfirm'),
    edge('ae10', 'aTask', 'aApi', 'API keys'),
    edge('ae11', 'aApi', 'sysApi'),
    edge('ae12', 'sysApi', 'aConfirm'),
    edge('ae13', 'aTask', 'aTrace', 'Traces'),
    edge('ae14', 'aTrace', 'sysTrace'),
    edge('ae15', 'sysTrace', 'aConfirm'),
    edge('ae16', 'aConfirm', 'aTask', 'Continue'),
    edge('ae17', 'aConfirm', 'aEnd', 'Finish'),
  ];

  return diagram('admin-activity', 'Admin Activity', 1020, 1140, cells);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2026-04-19T00:00:00.000Z" agent="Codex" version="29.6.1" editor="www.draw.io" compressed="false">${studentDiagram()}${staffDiagram()}${adminDiagram()}
</mxfile>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, xml, 'utf8');
console.log(`Generated ${outPath}`);
