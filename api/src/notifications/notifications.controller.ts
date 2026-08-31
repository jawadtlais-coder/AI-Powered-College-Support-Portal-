import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  @SkipThrottle()
  async unreadCount(
    @CurrentUser('userId') userId: string,
  ): Promise<{ unread: number }> {
    const unread = await this.notificationsService.getUnreadCount(userId);
    return { unread };
  }

  @Patch('read-all')
  async markAllRead(
    @CurrentUser('userId') userId: string,
  ): Promise<{ updated: number; unread: number }> {
    const updated = await this.notificationsService.markAllRead(userId);
    return { updated, unread: 0 };
  }
}
