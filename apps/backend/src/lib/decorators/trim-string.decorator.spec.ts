import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';

import { ActivityPayload } from 'src/activities/dtos/activity-payload.dto';
import { CreateInvitationPayload } from 'src/invitations/dtos/create-invitation.dto';
import { ProjectPayload } from 'src/projects/dtos/project-payload.dto';
import { CreateTeamDto } from 'src/teams/dtos/team.dto';

describe('string decorators on payloads', () => {
  it('keeps the case of project, client and activity names', () => {
    const project = plainToInstance(ProjectPayload, {
      name: '  CRM System ',
      clientName: ' Acme Ltd',
      description: 'Rollout for the EU team ',
    });
    const activity = plainToInstance(ActivityPayload, { name: ' Backend ' });

    expect(project).toMatchObject({
      name: 'CRM System',
      clientName: 'Acme Ltd',
      description: 'Rollout for the EU team',
    });
    expect(activity.name).toBe('Backend');
  });

  it('keeps the case of team names', () => {
    const team = plainToInstance(CreateTeamDto, { name: ' Delivery ' });

    expect(team.name).toBe('Delivery');
  });

  it('still lowercases emails', () => {
    const invitation = plainToInstance(CreateInvitationPayload, {
      email: ' Ada.Lovelace@Example.COM ',
    });

    expect(invitation.email).toBe('ada.lovelace@example.com');
  });
});
