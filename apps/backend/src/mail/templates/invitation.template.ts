interface InvitationTemplateParams {
  inviteUrl: string;
  expiresIn: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const invitationTemplate = ({
  inviteUrl,
  expiresIn,
}: InvitationTemplateParams): string => {
  const safeInviteUrl = escapeHtml(inviteUrl);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>You have been invited to WorkTrack</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          font-family: Arial, sans-serif;
          color: #0f172a;
        "
      >
        <div style="padding: 40px 20px;">
          <div
            style="
              max-width: 480px;
              margin: 0 auto;
              padding: 32px;
              background-color: #ffffff;
              border-radius: 12px;
            "
          >
            <h1 style="margin: 0 0 16px; font-size: 24px;">
              You have been invited to WorkTrack
            </h1>

            <p
              style="
                margin: 0 0 24px;
                font-size: 16px;
                line-height: 1.5;
              "
            >
              You have been invited to join a workspace on WorkTrack.
            </p>

            <p style="margin: 0 0 24px;">
              <a
                href="${safeInviteUrl}"
                style="
                  display: inline-block;
                  padding: 12px 20px;
                  background-color: #6366f1;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                "
              >
                Accept invitation
              </a>
            </p>

            <p
              style="
                margin: 0;
                font-size: 14px;
                line-height: 1.5;
                color: #64748b;
              "
            >
              This invitation will expire in ${expiresIn}.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};
