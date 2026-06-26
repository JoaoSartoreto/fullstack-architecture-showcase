import { Exclude } from 'class-transformer';
import { Column, Entity } from 'typeorm';
import { AbstractBaseEntity } from '../../core/database/entities/base.entity';
import { Role } from '../enums/role.enum';

@Entity('users')
export class UserEntity extends AbstractBaseEntity {
  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER })
  role: Role;
}