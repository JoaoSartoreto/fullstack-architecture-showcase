import { UserResponseDto } from "../../users/dto/user-response.dto";

export class OrderMessageResponseDto {
    id: string;
    orderId: string;
    senderId: string;
    content: string;
    createdAt: Date;

    sender?: UserResponseDto;
}