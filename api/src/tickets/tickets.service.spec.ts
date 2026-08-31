import {
  AcademicDepartment,
  NotificationType,
  Role,
  SupportArea,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const notificationsService = {
    createMany: jest.fn(),
    markTicketNotificationsRead: jest.fn(),
  };

  const mailService = {
    sendMail: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  function createService() {
    return new TicketsService(
      prisma as unknown as PrismaService,
      notificationsService as unknown as NotificationsService,
      mailService as never,
      configService as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('notifies admins and matching staff when a student creates a ticket', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      schoolId: '12345678',
      role: Role.STUDENT,
      active: true,
      academicDepartment: AcademicDepartment.ENGINEERING,
    });
    prisma.ticket.create.mockResolvedValue({
      id: 'ticket-1',
      student: {
        schoolId: '12345678',
      },
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'admin-1', email: null },
      { id: 'staff-1', email: 'staff@example.test' },
    ]);

    await createService().createTicket('student-1', {
      supportArea: SupportArea.IT,
      subject: 'Portal problem',
      description: 'The portal does not open.',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { role: Role.ADMIN },
          {
            role: Role.STAFF,
            supportArea: SupportArea.IT,
            academicDepartment: AcademicDepartment.ENGINEERING,
          },
        ],
        active: true,
      },
      select: {
        id: true,
        email: true,
      },
    });
    expect(notificationsService.createMany).toHaveBeenCalledWith(
      ['admin-1', 'staff-1'],
      NotificationType.TICKET_CREATED,
      `New ${SupportArea.IT} ticket for ${AcademicDepartment.ENGINEERING}`,
      'Ticket ticket-1 was created by student 12345678.',
    );
  });

  it('scopes staff queue to support area and academic department', async () => {
    prisma.ticket.findMany.mockResolvedValue([]);
    prisma.ticket.count.mockResolvedValue(0);

    await createService().listQueue(
      {},
      'staff-1',
      Role.STAFF,
      SupportArea.REGISTRATION,
      AcademicDepartment.BUSINESS,
    );

    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          supportArea: SupportArea.REGISTRATION,
          academicDepartment: AcademicDepartment.BUSINESS,
          OR: [{ assigneeId: null }, { assigneeId: 'staff-1' }],
        },
      }),
    );
    expect(prisma.ticket.count).toHaveBeenCalledWith({
      where: {
        supportArea: SupportArea.REGISTRATION,
        academicDepartment: AcademicDepartment.BUSINESS,
        OR: [{ assigneeId: null }, { assigneeId: 'staff-1' }],
      },
    });
  });
});
