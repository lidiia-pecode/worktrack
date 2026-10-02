import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ActivityPayload } from 'src/activities/dtos/activity-payload.dto';
import { CreateInvitationPayload } from 'src/invitations/dtos/create-invitation.dto';
import {
  ProjectPayload,
  UpdateProjectPayload,
} from 'src/projects/dtos/project-payload.dto';
import { CreateTeamDto, UpdateTeamDto } from 'src/teams/dtos/team.dto';
import { UpdateProfilePayload } from 'src/users/dtos/update-profile-payload.dto';

const errorFields = async <T extends object>(
  dto: new () => T,
  body: Record<string, unknown>,
) => {
  const errors = await validate(plainToInstance(dto, body));
  return errors.map((error) => error.property);
};

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

describe('a value of the wrong type in an optional text field', () => {
  it('is refused rather than skipped', async () => {
    await expect(
      errorFields(UpdateProfilePayload, { firstName: 123 }),
    ).resolves.toEqual(['firstName']);
    await expect(
      errorFields(UpdateTeamDto, { name: ['Delivery'] }),
    ).resolves.toEqual(['name']);
    await expect(
      errorFields(UpdateProjectPayload, { description: { text: 'x' } }),
    ).resolves.toEqual(['description']);
  });

  it('treats null as not sent in a field that cannot be cleared', () => {
    const team = plainToInstance(UpdateTeamDto, { name: null });

    expect(team.name).toBeUndefined();
  });

  it('keeps null for the client, so a project can be switched to internal work', async () => {
    const project = plainToInstance(UpdateProjectPayload, { clientName: null });

    expect(project.clientName).toBeNull();
    await expect(
      errorFields(UpdateProjectPayload, { clientName: null }),
    ).resolves.toEqual([]);
  });
});
