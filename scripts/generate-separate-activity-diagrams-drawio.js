#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'docs', 'activity-diagrams');

const C = {
  stroke: '#111827',
  fill: '#FFFFFF',
  text: '#111827',
  page: '#FFFFFF',
};

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cell(id, value, style, x, y, width, height) {
  return `
        <mxCell id="${id}" value="${escapeXml(value)}" style="${style}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />
        </mxCell>`;
}

function action(id, text, x, y, width = 190, height = 44) {
  return cell(
    id,
    text,
    `rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=${C.fill};strokeColor=${C.stroke};fontColor=${C.text};fontSize=11;spacing=6;`,
    x,
    y,
    width,
    height,
  );
}

function decision(id, text, x, y, width = 135, height = 78) {
  return cell(
    id,
    text,
    `rhombus;whiteSpace=wrap;html=1;fillColor=${C.fill};strokeColor=${C.stroke};fontColor=${C.text};fontSize=10;spacing=6;`,
    x,
    y,
    width,
    height,
  );
}

function start(id, x, y) {
  return cell(id, '', `ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=${C.stroke};strokeColor=${C.stroke};`, x, y, 28, 28);
}

function end(id, x, y) {
  return cell(id, '', `ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=${C.stroke};strokeColor=${C.stroke};`, x, y, 30, 30);
}

function edge(id, source, target, label = '', points = '') {
  return `
        <mxCell id="${id}" value="${escapeXml(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${C.stroke};endArrow=block;endFill=1;fontColor=${C.text};fontSize=10;" edge="1" parent="1" source="${source}" target="${target}">
          <mxGeometry relative="1" as="geometry">${points}</mxGeometry>
        </mxCell>`;
}

function diagramXml(id, name, pageWidth, pageHeight, cells) {
  return `<mxfile host="Electron" agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) draw.io/29.6.1 Chrome/142.0.7444.265 Electron/39.8.0 Safari/537.36" compressed="false" version="29.6.1">
  <diagram id="${id}" name="${escapeXml(name)}">
    <mxGraphModel dx="${pageWidth}" dy="${pageHeight}" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" background="${C.page}" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />${cells.join('')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

function loginDiagram() {
  const cells = [
    start('start', 386, 30),
    action('open', 'Open portal', 305, 82),
    decision('hasAccount', 'Has account?', 332, 152),
    action('register', 'Register student account', 90, 152),
    action('login', 'Login', 305, 250),
    decision('valid', 'Credentials valid?', 332, 335),
    action('error', 'Show login error', 580, 335),
    action('dashboard', 'Open dashboard', 305, 455),
    decision('role', 'Load role dashboard', 326, 535),
    action('studentDash', 'Student dashboard', 90, 665),
    action('staffDash', 'Staff dashboard', 305, 665),
    action('adminDash', 'Admin dashboard', 520, 665),
    end('endStudent', 170, 755),
    end('endStaff', 385, 755),
    end('endAdmin', 600, 755),
    edge('e1', 'start', 'open'),
    edge('e2', 'open', 'hasAccount'),
    edge('e3', 'hasAccount', 'register', 'No'),
    edge('e4', 'register', 'login'),
    edge('e5', 'hasAccount', 'login', 'Yes'),
    edge('e6', 'login', 'valid'),
    edge('e7', 'valid', 'dashboard', 'Yes'),
    edge('e8', 'valid', 'error', 'No'),
    edge('e9', 'error', 'login'),
    edge('e10', 'dashboard', 'role'),
    edge('e11', 'role', 'studentDash', 'Student'),
    edge('e12', 'role', 'staffDash', 'Staff'),
    edge('e13', 'role', 'adminDash', 'Admin'),
    edge('e14', 'studentDash', 'endStudent'),
    edge('e15', 'staffDash', 'endStaff'),
    edge('e16', 'adminDash', 'endAdmin'),
  ];

  return diagramXml('login-activity', 'Login Activity Diagram', 800, 830, cells);
}

function studentDiagram() {
  const cells = [
    start('start', 386, 30),
    action('open', 'Open student dashboard', 305, 82),
    decision('choose', 'Choose action', 332, 162),
    action('ask', 'Ask AI assistant', 55, 295),
    decision('escalate', 'Need escalation?', 82, 385),
    action('answer', 'Return assistant answer', 55, 510),
    action('ticket', 'Create / manage tickets', 305, 295),
    action('notify', 'View notifications', 305, 510),
    action('knowledge', 'Search knowledge base', 555, 295),
    action('logout', 'Logout', 305, 650),
    end('end', 385, 725),
    edge('e1', 'start', 'open'),
    edge('e2', 'open', 'choose'),
    edge('e3', 'choose', 'ask', 'Assistant'),
    edge('e4', 'ask', 'escalate'),
    edge('e5', 'escalate', 'answer', 'No'),
    edge('e6', 'escalate', 'ticket', 'Yes'),
    edge('e7', 'answer', 'notify'),
    edge('e8', 'choose', 'ticket', 'Tickets'),
    edge('e9', 'ticket', 'notify'),
    edge('e10', 'choose', 'knowledge', 'Knowledge'),
    edge('e11', 'knowledge', 'notify'),
    edge('e12', 'notify', 'logout'),
    edge('e13', 'logout', 'end'),
  ];

  return diagramXml('student-activity', 'Student Activity Diagram', 800, 790, cells);
}

function staffDiagram() {
  const cells = [
    start('start', 386, 30),
    action('open', 'Open staff dashboard', 305, 82),
    action('queue', 'View ticket queue', 305, 165),
    decision('available', 'Ticket available?', 332, 245),
    action('wait', 'Wait / refresh queue', 70, 245),
    action('review', 'Review ticket details', 305, 365),
    decision('assigned', 'Already assigned?', 332, 445),
    action('claim', 'Claim ticket', 70, 445),
    action('update', 'Reply or update status', 305, 565),
    decision('resolved', 'Resolved?', 332, 645),
    action('progress', 'Set IN_PROGRESS', 70, 645),
    action('close', 'Set RESOLVED and notify student', 530, 645),
    action('logout', 'Logout', 305, 765),
    end('end', 385, 840),
    edge('e1', 'start', 'open'),
    edge('e2', 'open', 'queue'),
    edge('e3', 'queue', 'available'),
    edge('e4', 'available', 'wait', 'No'),
    edge('e5', 'wait', 'queue'),
    edge('e6', 'available', 'review', 'Yes'),
    edge('e7', 'review', 'assigned'),
    edge('e8', 'assigned', 'claim', 'No'),
    edge('e9', 'claim', 'update'),
    edge('e10', 'assigned', 'update', 'Yes'),
    edge('e11', 'update', 'resolved'),
    edge('e12', 'resolved', 'progress', 'No'),
    edge('e13', 'progress', 'logout'),
    edge('e14', 'resolved', 'close', 'Yes'),
    edge('e15', 'close', 'logout'),
    edge('e16', 'logout', 'end'),
  ];

  return diagramXml('staff-activity', 'Staff Activity Diagram', 800, 910, cells);
}

function adminDiagram() {
  const cells = [
    start('start', 386, 30),
    action('open', 'Open admin dashboard', 305, 82),
    decision('choose', 'Choose action', 332, 162),
    action('users', 'Manage users and roles', 55, 295),
    action('knowledge', 'Manage FAQ and documents', 305, 295),
    action('keys', 'Manage API keys', 555, 295),
    action('traces', 'View orchestrator traces', 305, 425),
    action('save', 'Save changes', 305, 555),
    decision('more', 'More admin work?', 332, 635),
    action('logout', 'Logout', 305, 755),
    end('end', 385, 830),
    edge('e1', 'start', 'open'),
    edge('e2', 'open', 'choose'),
    edge('e3', 'choose', 'users', 'Users'),
    edge('e4', 'users', 'save'),
    edge('e5', 'choose', 'knowledge', 'Knowledge'),
    edge('e6', 'knowledge', 'save'),
    edge('e7', 'choose', 'keys', 'Keys'),
    edge('e8', 'keys', 'save'),
    edge('e9', 'choose', 'traces', 'Traces'),
    edge('e10', 'traces', 'save'),
    edge('e11', 'save', 'more'),
    edge('e12', 'more', 'choose', 'Yes'),
    edge('e13', 'more', 'logout', 'No'),
    edge('e14', 'logout', 'end'),
  ];

  return diagramXml('admin-activity', 'Admin Activity Diagram', 800, 900, cells);
}

function adminDetailedDiagram() {
  const cells = [
    start('start', 386, 25),
    action('open', 'Open portal', 305, 80),
    action('login', 'Login as admin', 305, 155),
    decision('valid', 'Credentials valid?', 332, 235),
    action('error', 'Show login error', 555, 235),
    decision('permission', 'Admin permission?', 332, 350),
    action('denied', 'Access denied', 90, 350),
    action('dashboard', 'Open admin dashboard', 305, 470),
    decision('choose', 'Choose admin action', 326, 555),
    action('users', 'Manage users and roles', 55, 690),
    action('knowledge', 'Manage FAQ / documents', 305, 690),
    action('keys', 'Manage API keys', 555, 690),
    action('traces', 'View orchestrator traces', 305, 810),
    action('save', 'Save changes', 305, 930),
    decision('more', 'More admin work?', 332, 1015),
    action('logout', 'Logout', 305, 1135),
    end('end', 385, 1210),
    edge('e1', 'start', 'open'),
    edge('e2', 'open', 'login'),
    edge('e3', 'login', 'valid'),
    edge('e4', 'valid', 'error', 'No'),
    edge('e5', 'error', 'login'),
    edge('e6', 'valid', 'permission', 'Yes'),
    edge('e7', 'permission', 'denied', 'No'),
    edge('e8', 'denied', 'login'),
    edge('e9', 'permission', 'dashboard', 'Yes'),
    edge('e10', 'dashboard', 'choose'),
    edge('e11', 'choose', 'users', 'Users'),
    edge('e12', 'users', 'save'),
    edge('e13', 'choose', 'knowledge', 'Knowledge'),
    edge('e14', 'knowledge', 'save'),
    edge('e15', 'choose', 'keys', 'Keys'),
    edge('e16', 'keys', 'save'),
    edge('e17', 'choose', 'traces', 'Traces'),
    edge('e18', 'traces', 'save'),
    edge('e19', 'save', 'more'),
    edge('e20', 'more', 'choose', 'Yes'),
    edge('e21', 'more', 'logout', 'No'),
    edge('e22', 'logout', 'end'),
  ];

  return diagramXml('admin-detailed-activity', 'Admin Activity Diagram Detailed', 820, 1280, cells);
}

function adminKnowledgeDiagram() {
  const cells = [
    start('start', 386, 25),
    action('open', 'Open admin dashboard', 305, 80),
    decision('choose', 'Choose management area', 332, 160),
    action('faq', 'Create / edit FAQ', 65, 300),
    action('document', 'Upload knowledge document', 305, 300),
    action('user', 'Manage support staff', 545, 300),
    decision('validDoc', 'Document valid?', 332, 420),
    action('fixDoc', 'Show upload error', 555, 420),
    action('process', 'Process document content', 305, 540),
    action('chunks', 'Split document into chunks', 305, 630),
    action('embed', 'Generate embeddings', 305, 720),
    action('save', 'Save knowledge update', 305, 810),
    action('notify', 'Notify admin of success', 305, 900),
    decision('more', 'More updates?', 332, 990),
    action('logout', 'Logout', 305, 1110),
    end('end', 385, 1185),
    edge('e1', 'start', 'open'),
    edge('e2', 'open', 'choose'),
    edge('e3', 'choose', 'faq', 'FAQ'),
    edge('e4', 'faq', 'save'),
    edge('e5', 'choose', 'document', 'Document'),
    edge('e6', 'document', 'validDoc'),
    edge('e7', 'validDoc', 'fixDoc', 'No'),
    edge('e8', 'fixDoc', 'document'),
    edge('e9', 'validDoc', 'process', 'Yes'),
    edge('e10', 'process', 'chunks'),
    edge('e11', 'chunks', 'embed'),
    edge('e12', 'embed', 'save'),
    edge('e13', 'choose', 'user', 'Staff'),
    edge('e14', 'user', 'save'),
    edge('e15', 'save', 'notify'),
    edge('e16', 'notify', 'more'),
    edge('e17', 'more', 'choose', 'Yes'),
    edge('e18', 'more', 'logout', 'No'),
    edge('e19', 'logout', 'end'),
  ];

  return diagramXml('admin-knowledge-activity', 'Admin Knowledge Management Activity', 820, 1260, cells);
}

function overviewDiagram() {
  const cells = [
    start('start', 386, 25),
    action('open', 'Open portal', 305, 80),
    decision('hasAccount', 'Has account?', 332, 155),
    action('register', 'Register student account', 90, 155),
    action('login', 'Login', 305, 255),
    decision('valid', 'Credentials valid?', 332, 335),
    action('error', 'Show login error', 585, 335),
    action('dashboard', 'Open dashboard', 305, 455),
    decision('choose', 'Choose action', 332, 555),
    action('ask', 'Ask AI assistant', 55, 670),
    decision('need', 'Need escalation?', 82, 760),
    action('answer', 'Return assistant answer', 55, 875),
    action('ticket', 'Create / manage tickets', 305, 670),
    action('notify', 'View notifications', 305, 875),
    action('knowledge', 'Search knowledge base', 555, 670),
    action('admin', 'Admin manages FAQ, documents, API keys', 555, 555, 245, 50),
    action('logout', 'Logout', 305, 990),
    end('end', 385, 1060),
    edge('e1', 'start', 'open'),
    edge('e2', 'open', 'hasAccount'),
    edge('e3', 'hasAccount', 'register', 'No'),
    edge('e4', 'register', 'login'),
    edge('e5', 'hasAccount', 'login', 'Yes'),
    edge('e6', 'login', 'valid'),
    edge('e7', 'valid', 'dashboard', 'Yes'),
    edge('e8', 'valid', 'error', 'No'),
    edge('e9', 'error', 'login'),
    edge('e10', 'dashboard', 'choose'),
    edge('e11', 'choose', 'ask', 'Assistant'),
    edge('e12', 'ask', 'need'),
    edge('e13', 'need', 'answer', 'No'),
    edge('e14', 'need', 'ticket', 'Yes'),
    edge('e15', 'answer', 'notify'),
    edge('e16', 'choose', 'ticket', 'Tickets'),
    edge('e17', 'ticket', 'notify'),
    edge('e18', 'choose', 'knowledge', 'Knowledge'),
    edge('e19', 'knowledge', 'notify'),
    edge('e20', 'choose', 'admin', 'Admin'),
    edge('e21', 'admin', 'notify'),
    edge('e22', 'notify', 'logout'),
    edge('e23', 'logout', 'end'),
  ];

  return diagramXml('overview-activity', 'College Support Activity Overview', 860, 1130, cells);
}

const diagrams = [
  ['login-activity.drawio', loginDiagram()],
  ['student-activity.drawio', studentDiagram()],
  ['staff-activity.drawio', staffDiagram()],
  ['admin-activity.drawio', adminDiagram()],
  ['admin-activity-detailed.drawio', adminDetailedDiagram()],
  ['admin-knowledge-activity.drawio', adminKnowledgeDiagram()],
  ['college-support-overview-activity.drawio', overviewDiagram()],
];

fs.mkdirSync(outDir, { recursive: true });
for (const [fileName, xml] of diagrams) {
  fs.writeFileSync(path.join(outDir, fileName), xml, 'utf8');
}

console.log(`Generated ${diagrams.length} activity diagrams in ${outDir}`);
