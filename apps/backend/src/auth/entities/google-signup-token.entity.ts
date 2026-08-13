// src/auth/entities/google-signup-token.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('google_signup_tokens')
export class GoogleSignupToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('UQ_google_signup_tokens_token_hash', {
    unique: true,
  })
  @Column({
    type: 'varchar',
    length: 64,
    name: 'token_hash',
  })
  tokenHash!: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  email!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'first_name',
  })
  firstName!: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'last_name',
  })
  lastName!: string;

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
