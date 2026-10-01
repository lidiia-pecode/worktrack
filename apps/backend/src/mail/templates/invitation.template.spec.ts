import { invitationEmail } from './invitation.template';

const PARAMS = {
  inviteUrl: 'https://app.test/invitations/complete?token=abc&x=1',
  companyName: 'Smith & Co',
  inviterName: 'Emma Clarke',
  roleDescription: 'an employee',
  teamName: 'Delivery',
  leadsTeam: false,
  validDays: 7,
};

describe('invitationEmail', () => {
  it('says who invited whom to what, and for how long', () => {
    const { subject, text } = invitationEmail(PARAMS);

    expect(subject).toBe('Emma Clarke invited you to Smith & Co on WorkTrack');
    expect(text).toContain(
      'Emma Clarke invited you to join Smith & Co on WorkTrack as an employee, in the team “Delivery”.',
    );
    expect(text).toContain('The invitation is valid for 7 days.');
    expect(text).toContain('you can ignore this email');
  });

  it('gives the plain link in both parts', () => {
    const { html, text } = invitationEmail(PARAMS);

    expect(text).toContain(`Accept the invitation: ${PARAMS.inviteUrl}`);
    expect(html).toContain(
      '>https://app.test/invitations/complete?token=abc&amp;x=1</a>',
    );
  });

  it('escapes names in the HTML', () => {
    const { html } = invitationEmail({
      ...PARAMS,
      companyName: '<b>Acme</b>',
    });

    expect(html).not.toContain('<b>Acme</b>');
    expect(html).toContain('&lt;b&gt;Acme&lt;/b&gt;');
  });

  it('says a manager is invited to lead the team', () => {
    const { text } = invitationEmail({
      ...PARAMS,
      roleDescription: 'a manager',
      leadsTeam: true,
    });

    expect(text).toContain('as a manager, leading the team “Delivery”.');
  });

  it('reads well without an inviter or a team', () => {
    const { subject, text } = invitationEmail({
      ...PARAMS,
      inviterName: null,
      roleDescription: 'a manager',
      teamName: null,
    });

    expect(subject).toBe('You are invited to Smith & Co on WorkTrack');
    expect(text).toContain(
      'You are invited to join Smith & Co on WorkTrack as a manager.',
    );
  });
});
