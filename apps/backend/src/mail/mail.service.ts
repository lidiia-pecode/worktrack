import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { passwordResetTemplate } from './templates/password-reset.template';
import { invitationTemplate } from './templates/invitation.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('mail.apiKey');

    this.resend = new Resend(apiKey);
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const from = this.configService.getOrThrow<string>('mail.from');
    const expiresIn = this.configService.getOrThrow<string>(
      'auth.passwordReset.expiresIn',
    );

    const { error } = await this.resend.emails.send({
      from,
      to: email,
      subject: 'Reset your WorkTrack password',
      html: passwordResetTemplate({
        resetUrl,
        expiresIn,
      }),
    });

    if (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );

      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }
  }

  async sendInvitationEmail(email: string, inviteUrl: string): Promise<void> {
    const from = this.configService.getOrThrow<string>('mail.from');

    const expiresIn = this.configService.getOrThrow<string>(
      'auth.invitation.expiresIn',
    );

    const { error } = await this.resend.emails.send({
      from,
      to: email,
      subject: 'You have been invited to WorkTrack',
      html: invitationTemplate({
        inviteUrl,
        expiresIn,
      }),
    });

    if (error) {
      this.logger.error(`Failed to send invitation email to ${email}`, error);

      throw new InternalServerErrorException('Failed to send invitation email');
    }
  }
}
