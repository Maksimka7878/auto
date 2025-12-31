import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { Workflow } from './schemas/workflow.schema';
import { UsersService } from '../users/users.service';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let model: Model<Workflow>;
  let usersService: jest.Mocked<UsersService>;

  const mockWorkflow = {
    _id: 'workflow-id',
    userId: { toString: () => 'user-id' },
    name: 'Test Workflow',
    description: 'Test description',
    nodes: [],
    connections: [],
    isActive: false,
    status: 'draft',
    webhookUrl: 'webhook/test',
    webhookSecret: 'secret',
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        {
          provide: getModelToken(Workflow.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockWorkflow),
            constructor: jest.fn().mockResolvedValue(mockWorkflow),
            find: jest.fn(),
            findById: jest.fn(),
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            countDocuments: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            getUserStats: jest.fn().mockResolvedValue({
              workflowsCount: 1,
              limits: { workflowsLimit: 10 },
            }),
            incrementWorkflowCount: jest.fn(),
            decrementWorkflowCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    model = module.get<Model<Workflow>>(getModelToken(Workflow.name));
    usersService = module.get(UsersService);
  });

  describe('create', () => {
    it('should create a workflow successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockWorkflow);
      jest.spyOn(model, 'create').mockImplementation(() => ({
        ...mockWorkflow,
        save: mockSave,
      } as any));

      const result = await service.create('user-id', {
        name: 'Test Workflow',
        description: 'Test',
      });

      expect(usersService.getUserStats).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when limit reached', async () => {
      usersService.getUserStats.mockResolvedValue({
        workflowsCount: 10,
        executionsThisMonth: 0,
        storageUsed: 0,
        plan: 'free',
        limits: { workflowsLimit: 10, executionsLimit: 100, storageLimit: 100 },
      });

      await expect(
        service.create('user-id', { name: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('should return a workflow by id', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWorkflow),
      } as any);

      const result = await service.findById('workflow-id', 'user-id');

      expect(result).toEqual(mockWorkflow);
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.findById('invalid-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong user', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockWorkflow,
          userId: { toString: () => 'other-user-id' },
        }),
      } as any);

      await expect(
        service.findById('workflow-id', 'user-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return paginated workflows', async () => {
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockWorkflow]),
      };

      jest.spyOn(model, 'find').mockReturnValue(mockFind as any);
      jest.spyOn(model, 'countDocuments').mockResolvedValue(1);

      const result = await service.findAll('user-id', { page: 1, limit: 10 });

      expect(result.workflows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete a workflow successfully', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWorkflow),
      } as any);
      jest.spyOn(model, 'findByIdAndDelete').mockResolvedValue(mockWorkflow as any);

      await service.delete('workflow-id', 'user-id');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('workflow-id');
      expect(usersService.decrementWorkflowCount).toHaveBeenCalled();
    });
  });
});
