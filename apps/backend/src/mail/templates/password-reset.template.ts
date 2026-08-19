interface PasswordResetTemplateParams {
  resetUrl: string;
  expiresIn: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const passwordResetTemplate = ({
  resetUrl,
  expiresIn,
}: PasswordResetTemplateParams): string => {
  const safeResetUrl = escapeHtml(resetUrl);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset your WorkTrack password</title>
      </head>

      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
        <div style="padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 12px;">
            <h1 style="margin: 0 0 16px; font-size: 24px;">
              Reset your password
            </h1>

            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">
              We received a request to reset your WorkTrack password.
            </p>

            <p style="margin: 0 0 24px;">
              <a
                href="${safeResetUrl}"
                style="display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;"
              >
                Reset password
              </a>
            </p>

            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #64748b;">
              This link will expire in ${expiresIn}.
            </p>

            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #64748b;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};
