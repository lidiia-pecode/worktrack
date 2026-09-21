import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { AbsenceType } from '../enums/absence-type.enum';

@Entity('absences')
@Check(`"end_date" >= "start_date"`)
@Index('IDX_absences_company_user_start', ['companyId', 'userId', 'startDate'])
export class Absence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'company_id',
    nullable: false,
  })
  companyId!: string;

  /**
   * Every absence belongs to one person, including a public holiday: whether
   * somebody takes a holiday or works it is their own record to make.
   */
  @Column({
    type: 'uuid',
    name: 'user_id',
    nullable: false,
  })
  userId!: string;

  @Column({
    type: 'enum',
    enum: AbsenceType,
    enumName: 'absence_type_enum',
    nullable: false,
  })
  type!: AbsenceType;

  @Column({ type: 'date', name: 'start_date', nullable: false })
  startDate!: string;

  @Column({ type: 'date', name: 'end_date', nullable: false })
  endDate!: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt!: Date;

  // ==========================================
  // RELATIONS
  // ==========================================

  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @ManyToOne(() => User, (user) => user.absences, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
