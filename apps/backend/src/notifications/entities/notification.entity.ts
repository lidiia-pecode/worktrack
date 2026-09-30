import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';

import { NotificationType } from '../enums/notification-type.enum';

/**
 * Something one person is told in the app. Deliberately small: one row per
 * recipient, a type, the person it is about and whether it has been read.
 */
@Entity('notifications')
@Index('IDX_notifications_recipient_created_at', ['recipientId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'company_id', nullable: false })
  companyId!: string;

  @Column({ type: 'uuid', name: 'recipient_id', nullable: false })
  recipientId!: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    enumName: 'notification_type_enum',
    nullable: false,
  })
  type!: NotificationType;

  @Column({ type: 'uuid', name: 'subject_user_id', nullable: true })
  subjectUserId!: string | null;

  @Column({ type: 'timestamp with time zone', name: 'read_at', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient!: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subject_user_id' })
  subjectUser!: User | null;
}
