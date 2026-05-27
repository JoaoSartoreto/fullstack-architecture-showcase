import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderEntity } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { OrderItemEntity } from './entities/order-item.entity';
import { ProductsService } from './../products/products.service';
import { OrderMessageEntity } from './entities/order-message.entity';
import { Role } from '../common/enums/role.enum';

describe('OrdersService', () => {
  let service: OrdersService;

  // Create the EntityManager double (handles the actual DB operations)
  const mockEntityManager = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  // Create the DataSource double (manages the transaction scope)
  const mockDataSource = {
    manager: mockEntityManager,
    // Simulate the transaction method receiving a callback and injecting our mockEntityManager into it
    transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockEntityManager);
    }),
  };

  // Double for the standard OrderRepository used in read/update operations
  const mockOrderRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockProductsService = {
    decrementStock: jest.fn(),
  };

  const mockMessageRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        // Instruct NestJS to use our double whenever the service requests a DataSource
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(OrderEntity), useValue: mockOrderRepository },
        { provide: getRepositoryToken(OrderMessageEntity), useValue: mockMessageRepository },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Cart and Checkout
  describe('createDraft', () => {
    it('should successfully create an order header in DRAFT status and process its items', async () => {
      const mockOrderHeader = { id: 'order-uuid', userId: 'user-1', status: OrderStatus.DRAFT };
      const mockProduct = { id: 'prod-1', name: 'Product 1', price: 100, isActive: true };

      mockEntityManager.create.mockReturnValueOnce(mockOrderHeader);
      mockEntityManager.save.mockResolvedValueOnce(mockOrderHeader);
      mockEntityManager.findOne.mockResolvedValueOnce(mockProduct);

      const result = await service.createDraft('user-1', {
        items: [{ productId: 'prod-1', quantity: 2 }],
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.DRAFT);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2); // Header + Item Line
    });
  });

  describe('checkout', () => {
    it('should successfully transition DRAFT to PENDING and freeze current catalog prices', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        status: OrderStatus.DRAFT,
        items: [{ productId: 'prod-1', priceAtPurchase: 0 }]
      };
      const mockProduct = { id: 'prod-1', name: 'Product 1', price: 150, isActive: true };

      // Sequence of findOne calls inside checkout transaction
      mockEntityManager.findOne.mockResolvedValueOnce(mockOrder);   // 1. Fetches the order
      mockEntityManager.findOne.mockResolvedValueOnce(mockProduct); // 2. Fetches the current catalog item
      mockEntityManager.save.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.checkout('order-1', 'user-1');

      expect(mockOrder.status).toBe(OrderStatus.PENDING);
      expect(mockOrder.items[0].priceAtPurchase).toBe(150); // Locked price check
      expect(result.status).toBe(OrderStatus.PENDING);
    });
  });

  // Staff Negotiation
  describe('updateNegotiationItems', () => {
    it('should allow STAFF to overwrite items when the order status is IN_NEGOTIATION', async () => {
      const mockExistingItem = { id: 'item-1', productId: 'prod-old', quantity: 1 };
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.IN_NEGOTIATION,
        items: [mockExistingItem] // Order now comes with existing items
      };
      const mockNewProduct = { id: 'prod-new', name: 'Product New', price: 50, isActive: true };

      mockEntityManager.findOne.mockResolvedValueOnce(mockOrder);
      mockEntityManager.findOne.mockResolvedValueOnce(mockNewProduct);
      mockEntityManager.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.updateNegotiationItems('order-1', {
        items: [{ productId: 'prod-new', quantity: 5 }],
      });

      // It should delete the old item that wasn't in the new array
      expect(mockEntityManager.delete).toHaveBeenCalledWith(OrderItemEntity, { id: 'item-1' });
      // It should create and save the new item
      expect(mockEntityManager.create).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should block item modifications if the order is not in IN_NEGOTIATION status', async () => {
      const mockPendingOrder = { id: 'order-1', status: OrderStatus.PENDING };
      mockEntityManager.findOne.mockResolvedValueOnce(mockPendingOrder);

      await expect(
        service.updateNegotiationItems('order-1', { items: [{ productId: 'prod-1', quantity: 1 }] })
      ).rejects.toThrow(BadRequestException);

      expect(mockEntityManager.delete).not.toHaveBeenCalled();
    });
  });

  // Status Updates and Filters
  describe('updateStatus', () => {
    it('should throw NotFoundException if the order does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateStatus('invalid-id', { status: OrderStatus.APPROVED })
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully update status without touching inventory if status is NOT APPROVED', async () => {
      const mockOrder = { id: 'order-1', status: OrderStatus.PENDING, items: [] };
      mockEntityManager.findOne.mockResolvedValueOnce(mockOrder);
      mockEntityManager.save.mockImplementation((order) => Promise.resolve(order));

      const result = await service.updateStatus('order-1', { status: OrderStatus.IN_NEGOTIATION });

      expect(result.status).toBe(OrderStatus.IN_NEGOTIATION);
      expect(mockProductsService.decrementStock).not.toHaveBeenCalled(); // Inventory is safe
    });

    it('should successfully update status AND deduct inventory if status IS APPROVED', async () => {
      const mockItems = [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 }
      ];
      const mockOrder = { id: 'order-1', status: OrderStatus.IN_NEGOTIATION, items: mockItems };

      mockEntityManager.findOne.mockResolvedValueOnce(mockOrder);
      mockEntityManager.save.mockImplementation((order) => Promise.resolve(order));

      const result = await service.updateStatus('order-1', { status: OrderStatus.APPROVED });

      expect(result.status).toBe(OrderStatus.APPROVED);
      // Ensures the external domain was called for each item
      expect(mockProductsService.decrementStock).toHaveBeenCalledTimes(2);
      expect(mockProductsService.decrementStock).toHaveBeenCalledWith(mockEntityManager, 'prod-1', 2);
      expect(mockProductsService.decrementStock).toHaveBeenCalledWith(mockEntityManager, 'prod-2', 1);
    });

    it('should successfully assign a rejection reason when REJECTED', async () => {
      const mockOrder = { id: 'order-1', status: OrderStatus.PENDING, items: [] };
      mockEntityManager.findOne.mockResolvedValueOnce(mockOrder);
      mockEntityManager.save.mockImplementation((order) => Promise.resolve(order));

      const result = await service.updateStatus('order-1', {
        status: OrderStatus.REJECTED,
        rejectionReason: 'Not enough budget'
      });

      expect(result.status).toBe(OrderStatus.REJECTED);
      expect(result.rejectionReason).toBe('Not enough budget');
      expect(mockProductsService.decrementStock).not.toHaveBeenCalled();
    });
  });

  // Add this inside the describe('OrdersService') block

  describe('removeItemFromDraft', () => {
    const mockUserId = 'user-1';
    const mockItemId = 'item-uuid';

    it('should successfully remove an item from a DRAFT order owned by the user', async () => {
      const mockItem = {
        id: mockItemId,
        order: { userId: mockUserId, status: OrderStatus.DRAFT },
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockItem);

      await service.removeItemFromDraft(mockUserId, mockItemId);

      expect(mockEntityManager.findOne).toHaveBeenCalledWith(OrderItemEntity, {
        where: { id: mockItemId },
        relations: { order: true },
      });
      expect(mockEntityManager.delete).toHaveBeenCalledWith(OrderItemEntity, { id: mockItemId });
    });

    it('should throw NotFoundException if the item does not exist', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null);

      await expect(service.removeItemFromDraft(mockUserId, mockItemId)).rejects.toThrow(NotFoundException);
      expect(mockEntityManager.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if the order belongs to a different user (IDOR protection)', async () => {
      const mockItem = {
        id: mockItemId,
        order: { userId: 'different-user-id', status: OrderStatus.DRAFT },
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockItem);

      // Even though the item exists, the utility should mask it with a 404 to protect privacy
      await expect(service.removeItemFromDraft(mockUserId, mockItemId)).rejects.toThrow(NotFoundException);
      expect(mockEntityManager.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if the order is no longer in DRAFT status', async () => {
      const mockItem = {
        id: mockItemId,
        // The user owns the order, but it has already advanced past the cart phase
        order: { userId: mockUserId, status: OrderStatus.PENDING },
      };

      mockEntityManager.findOne.mockResolvedValueOnce(mockItem);

      await expect(service.removeItemFromDraft(mockUserId, mockItemId)).rejects.toThrow(BadRequestException);
      expect(mockEntityManager.delete).not.toHaveBeenCalled();
    });
  });

  describe('findAllForStaff', () => {
    it('should return all orders except DRAFTs for staff view', async () => {
      mockOrderRepository.find.mockResolvedValue([]);
      await service.findAllForStaff();

      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { status: expect.any(Object) }, // TypeORM Not() operator
        relations: { user: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findAllForCustomer', () => {
    it('should return only the orders belonging to the logged customer', async () => {
      mockOrderRepository.find.mockResolvedValue([]);
      await service.findAllForCustomer('user-1');

      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOneDetails', () => {
    it('should return detailed order with items if user has access', async () => {
      const mockOrder = { id: 'order-1', userId: 'user-1' };
      mockOrderRepository.findOne.mockResolvedValueOnce(mockOrder);

      const result = await service.findOneDetails('order-1', 'user-1', Role.CUSTOMER);

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        relations: { user: true, items: { product: true } },
      });
    });

    it('should throw ForbiddenException if a CUSTOMER tries to view another customers order', async () => {
      const mockOrder = { id: 'order-1', userId: 'user-1' }; // Belongs to user-1
      mockOrderRepository.findOne.mockResolvedValueOnce(mockOrder);

      // user-2 tries to access it
      await expect(
        service.findOneDetails('order-1', 'user-2', Role.CUSTOMER)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOrderMessages', () => {
    it('should return chat history in DESC order for authorized users', async () => {
      const mockOrder = { id: 'order-1', userId: 'user-1' };
      mockOrderRepository.findOne.mockResolvedValueOnce(mockOrder);
      mockMessageRepository.find.mockResolvedValueOnce([]);

      await service.findOrderMessages('order-1', 'user-1', Role.CUSTOMER);

      expect(mockMessageRepository.find).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        relations: { sender: true },
        order: { createdAt: 'DESC' }, // Testing your UX decision!
      });
    });
  });

  describe('addMessage', () => {
    const mockDto = { content: 'Hello, please lower the price.' };

    it('should save a new message if the order is IN_NEGOTIATION', async () => {
      const mockOrder = { id: 'order-1', userId: 'user-1', status: OrderStatus.IN_NEGOTIATION };
      const mockCreatedMessage = { id: 'msg-1', content: mockDto.content };

      mockOrderRepository.findOne.mockResolvedValueOnce(mockOrder);
      mockMessageRepository.create.mockReturnValueOnce(mockCreatedMessage);
      mockMessageRepository.save.mockResolvedValueOnce(mockCreatedMessage);

      const result = await service.addMessage('order-1', 'user-1', Role.CUSTOMER, mockDto);

      expect(result).toEqual(mockCreatedMessage);
      expect(mockMessageRepository.create).toHaveBeenCalledWith({
        orderId: 'order-1',
        senderId: 'user-1',
        content: 'Hello, please lower the price.',
      });
    });

    it('should throw BadRequestException if order is not IN_NEGOTIATION', async () => {
      const mockPendingOrder = { id: 'order-1', userId: 'user-1', status: OrderStatus.PENDING };
      mockOrderRepository.findOne.mockResolvedValueOnce(mockPendingOrder);

      await expect(
        service.addMessage('order-1', 'user-1', Role.CUSTOMER, mockDto)
      ).rejects.toThrow(BadRequestException);

      expect(mockMessageRepository.save).not.toHaveBeenCalled();
    });
  });
});