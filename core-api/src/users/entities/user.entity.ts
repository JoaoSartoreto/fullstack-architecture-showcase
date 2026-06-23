import { Exclude } from 'class-transformer';
import { Role } from '../enums/role.enum';
import { Entity, Column } from 'typeorm';
import { AbstractBaseEntity } from '../../core/database/entities/base.entity';

@Entity('users')
export class UserEntity extends AbstractBaseEntity {
  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER })
  role: Role;
}