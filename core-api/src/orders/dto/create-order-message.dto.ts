import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateOrderMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000, { message: 'Message content cannot exceed 2000 characters.' })
  content: string;
}