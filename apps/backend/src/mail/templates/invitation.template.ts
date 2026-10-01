import { escapeHtml } from './escape-html';

export interface InvitationEmailParams {
  inviteUrl: string;
  companyName: string;
  inviterName: string | null;
  roleDescription: string;
  teamName: string | null;
  leadsTeam: boolean;
  validDays: number;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const describeInvitation = ({
  companyName,
  inviterName,
  roleDescription,
  teamName,
  leadsTeam,
}: InvitationEmailParams): string => {
  const who = inviterName ? `${inviterName} invited you` : 'You are invited';

  const team = teamName
    ? `, ${leadsTeam ? 'leading' : 'in'} the team “${teamName}”`
    : '';

  return `${who} to join ${companyName} on WorkTrack as ${roleDescription}${team}.`;
};

export const invitationEmail = (
  params: InvitationEmailParams,
): EmailContent => {
  const { inviteUrl, companyName, inviterName, validDays } = params;

  const subject = inviterName
    ? `${inviterName} invited you to ${companyName} on WorkTrack`
    : `You are invited to ${companyName} on WorkTrack`;
  const description = describeInvitation(params);
  const validity = `The invitation is valid for ${validDays} days.`;
  const unexpected =
    'If you were not expecting this invitation, you can ignore this email.';

  const text = [
    description,
    `Accept the invitation: ${inviteUrl}`,
    validity,
    unexpected,
  ].join('\n\n');

  const safeUrl = escapeHtml(inviteUrl);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(subject)}</title>
      </head>

      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
        <div style="padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 12px;">
            <h1 style="margin: 0 0 16px; font-size: 24px;">
              Join ${escapeHtml(companyName)} on WorkTrack
            </h1>

            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">
              ${escapeHtml(description)}
            </p>

            <p style="margin: 0 0 24px;">
              <a
                href="${safeUrl}"
                style="display: inline-block; padding: 12px 20px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;"
              >
                Accept invitation
              </a>
            </p>

            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.5; color: #64748b;">
              If the button does not work, copy this link into your browser:<br />
              <a href="${safeUrl}" style="color: #4f46e5; word-break: break-all;">${safeUrl}</a>
            </p>

            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #64748b;">
              ${validity}
            </p>

            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #64748b;">
              ${unexpected}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, html, text };
};
