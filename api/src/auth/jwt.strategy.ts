import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AcademicDepartment, Role, SupportArea } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'change-me',
    });
  }

  async validate(payload: {
    sub: string;
    schoolId: string;
    role: Role;
    supportArea?: SupportArea | null;
    department?: SupportArea | null;
    academicDepartment?: AcademicDepartment | null;
  }): Promise<{
    userId: string;
    schoolId: string;
    role: Role;
    supportArea: SupportArea | null;
    academicDepartment: AcademicDepartment | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        schoolId: true,
        role: true,
        supportArea: true,
        academicDepartment: true,
        active: true,
      },
    });

    if (!user?.active) {
      throw new UnauthorizedException('Invalid or inactive user.');
    }

    return {
      userId: user.id,
      schoolId: user.schoolId,
      role: user.role,
      supportArea: user.supportArea,
      academicDepartment: user.academicDepartment,
    };
  }
}
