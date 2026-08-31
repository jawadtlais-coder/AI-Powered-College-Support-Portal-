/* eslint-disable no-console */
const {
  KnowledgeSourceType,
  PrismaClient,
  Role,
  SupportArea,
  TicketStatus,
} = require('@prisma/client');
const argon2 = require('argon2');
const { createHash } = require('crypto');
const { promises: fs } = require('fs');
const path = require('path');

function chunkText(input, chunkSize = 700) {
  const normalized = input.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (block.length <= chunkSize) {
      current = block;
      continue;
    }

    for (let i = 0; i < block.length; i += chunkSize) {
      chunks.push(block.slice(i, i + chunkSize).trim());
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function fallbackEmbedding(text) {
  const size = 64;
  const vec = new Array(size).fill(0);

  for (let i = 0; i < text.length; i += 1) {
    vec[i % size] += text.charCodeAt(i) / 255;
  }

  const digest = createHash('sha256').update(text).digest();
  for (let i = 0; i < size; i += 1) {
    vec[i] += digest[i % digest.length] / 255;
  }

  const norm = Math.sqrt(vec.reduce((acc, value) => acc + value * value, 0));
  return norm === 0 ? vec : vec.map((value) => value / norm);
}

function titleFromMarkdown(fileName, content) {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading) {
    return heading[1].trim();
  }

  return path.basename(fileName, path.extname(fileName)).replace(/[-_]+/g, ' ');
}

function normalizeTitleKey(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function supportAreaFromMarkdown(fileName, content) {
  const metadataMatch = content.match(/^supportArea:\s*(REGISTRATION|IT)\s*$/im);
  if (metadataMatch) {
    return metadataMatch[1] === 'IT' ? SupportArea.IT : SupportArea.REGISTRATION;
  }

  const key = normalizeTitleKey(`${fileName} ${titleFromMarkdown(fileName, content)}`);
  const words = new Set(key.split(/\s+/).filter(Boolean));

  if (
    words.has('it') ||
    key.includes('information technology') ||
    key.includes('technical support')
  ) {
    return SupportArea.IT;
  }

  return SupportArea.REGISTRATION;
}

async function seedKnowledgeDocuments(prisma, adminId) {
  const knowledgeDir = process.env.KNOWLEDGE_SEED_DIR
    ? path.resolve(process.env.KNOWLEDGE_SEED_DIR)
    : path.resolve(__dirname, '../../docs/knowledge');

  let files = [];
  try {
    files = await fs.readdir(knowledgeDir);
  } catch {
    console.log('[seed] Knowledge directory not found. Skipping documents.');
    return;
  }

  for (const fileName of files.filter((file) => file.endsWith('.md'))) {
    const content = (await fs.readFile(path.join(knowledgeDir, fileName), 'utf8')).trim();
    if (!content) {
      continue;
    }

    const title = titleFromMarkdown(fileName, content);
    const fileTitle = titleFromMarkdown(fileName, '');
    const supportArea = supportAreaFromMarkdown(fileName, content);
    const titleKey = normalizeTitleKey(title);
    const fileTitleKey = normalizeTitleKey(fileTitle);
    const existingCandidates = await prisma.knowledgeDocument.findMany({
      where: {
        supportArea,
      },
      select: {
        id: true,
        title: true,
      },
    });
    const matchingCandidates = existingCandidates.filter((document) => {
      const candidateKey = normalizeTitleKey(document.title);
      return candidateKey === titleKey || candidateKey === fileTitleKey;
    });
    const exactMatch = matchingCandidates.find((document) => document.title === title);
    const existing = exactMatch ?? matchingCandidates[0];

    const document = existing
      ? await prisma.knowledgeDocument.update({
          where: {
            id: existing.id,
          },
          data: {
            content,
            status: 'ACTIVE',
            uploadedBy: adminId,
          },
          select: {
            id: true,
          },
        })
      : await prisma.knowledgeDocument.create({
          data: {
            title,
            supportArea,
            sourceType: KnowledgeSourceType.DOCUMENT,
            content,
            uploadedBy: adminId,
          },
          select: {
            id: true,
          },
        });

    const duplicates = matchingCandidates.filter((item) => item.id !== document.id);

    if (duplicates.length > 0) {
      await prisma.knowledgeChunk.deleteMany({
        where: {
          documentId: {
            in: duplicates.map((item) => item.id),
          },
        },
      });
      await prisma.knowledgeDocument.deleteMany({
        where: {
          id: {
            in: duplicates.map((item) => item.id),
          },
        },
      });
      console.log(`[seed] Removed ${duplicates.length} duplicate knowledge document(s) for ${title}.`);
    }

    await prisma.knowledgeChunk.deleteMany({
      where: {
        documentId: document.id,
      },
    });

    const chunks = chunkText(content);
    if (chunks.length > 0) {
      await prisma.knowledgeChunk.createMany({
        data: chunks.map((chunk, index) => ({
          documentId: document.id,
          chunkText: chunk,
          embedding: fallbackEmbedding(chunk),
          chunkIndex: index,
        })),
      });
    }

    console.log(`[seed] Knowledge document ready: ${title} [${supportArea}] (${chunks.length} chunks).`);
  }
}

async function backfillMissingProfiles(prisma) {
  const users = await prisma.user.findMany({
    where: {
      profile: null,
    },
    select: {
      id: true,
      schoolId: true,
      role: true,
    },
  });

  for (const user of users) {
    await prisma.profile.create({
      data: {
        userId: user.id,
        fullName: `${user.role} ${user.schoolId}`,
      },
    });
  }

  if (users.length > 0) {
    console.log(`[seed] Backfilled ${users.length} missing profiles.`);
  }
}

async function seedAdmin() {
  const prisma = new PrismaClient();

  const schoolId = process.env.BOOTSTRAP_ADMIN_SCHOOL_ID || '00000001';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin1234!';
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME || 'System Admin';
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || null;

  try {
    const existing = await prisma.user.findUnique({
      where: { schoolId },
      select: { id: true },
    });

    let adminId = existing?.id;

    if (existing) {
      console.log(`[seed] Admin ${schoolId} already exists.`);
    } else {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

      const admin = await prisma.user.create({
        data: {
          schoolId,
          email,
          passwordHash,
          role: Role.ADMIN,
          supportArea: null,
          academicDepartment: null,
          profile: {
            create: {
              fullName,
            },
          },
        },
        select: {
          id: true,
        },
      });

      adminId = admin.id;
      console.log(`[seed] Admin created. schoolId=${schoolId}`);
    }

    await seedKnowledgeDocuments(prisma, adminId);
    await backfillMissingProfiles(prisma);

    await prisma.user.updateMany({
      where: { role: Role.ADMIN },
      data: {
        supportArea: null,
        academicDepartment: null,
      },
    });

    const ticketsToBackfill = await prisma.ticket.findMany({
      where: {
        academicDepartment: null,
      },
      select: {
        id: true,
        student: {
          select: {
            academicDepartment: true,
          },
        },
      },
    });

    for (const ticket of ticketsToBackfill) {
      if (!ticket.student.academicDepartment) {
        continue;
      }

      await prisma.ticket.update({
        where: {
          id: ticket.id,
        },
        data: {
          academicDepartment: ticket.student.academicDepartment,
        },
      });
    }

    const studentsToSync = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        academicDepartment: {
          not: null,
        },
      },
      select: {
        id: true,
        academicDepartment: true,
      },
    });

    for (const student of studentsToSync) {
      await prisma.ticket.updateMany({
        where: {
          studentId: student.id,
          academicDepartment: null,
          status: {
            not: TicketStatus.RESOLVED,
          },
        },
        data: {
          academicDepartment: student.academicDepartment,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin().catch((error) => {
  console.error('[seed] Failed to seed admin:', error);
  process.exit(1);
});
