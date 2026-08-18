// apps/backend/src/auth/entities/google-link-token.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('google_link_tokens')
export class GoogleLinkToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('UQ_google_link_tokens_token_hash', {
    unique: true,
  })
  @Column({
    type: 'varchar',
    length: 64,
    name: 'token_hash',
  })
  tokenHash!: string;

  @Column({
    type: 'uuid',
    name: 'user_id',
  })
  userId!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'google_id',
  })
  googleId!: string;

  @Column({
    type: 'timestamp with time zone',
    name: 'expires_at',
  })
  expiresAt!: Date;

  @Column({
    type: 'timestamp with time zone',
    name: 'used_at',
    nullable: true,
  })
  usedAt!: Date | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt!: Date;
}
