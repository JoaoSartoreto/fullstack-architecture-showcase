import { CatalogItemResponseDto } from "../../products/dto/catalog-item-response.dto";

export class OrderItemResponseDto {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    priceAtPurchase: number;
    createdAt: Date;
    product?: CatalogItemResponseDto;
}