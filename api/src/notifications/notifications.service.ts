import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
      })),
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return result.count;
  }

  async markTicketNotificationsRead(
    userId: string,
    ticketId: string,
  ): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
        message: {
          contains: ticketId,
        },
      },
      data: {
        read: true,
      },
    });

    return result.count;
  }
}
