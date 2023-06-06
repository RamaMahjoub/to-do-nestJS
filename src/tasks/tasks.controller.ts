/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from '@prisma/client';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';
import { Request } from 'express';
import { ITaskCreate, ITaskUpdate } from 'src/models/requests/task.model';
import {
  IOrderDifferentColumns,
  IOrderSameColumn,
} from 'src/models/requests/orderTasks.model';

@Controller('tasks')
export class TasksController {
  constructor(private readonly taskService: TasksService) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  async create(
    @Req() req: Request,
    @Body()
    taskData: ITaskCreate,
  ): Promise<Task> {
    return this.taskService.createTask(req.user['sub'], taskData);
  }
  
  @UseGuards(AccessTokenGuard)
  @Post('/update/:taskId')
  async update(
    @Param('taskId') taskId: string,
    @Req() req: Request,
    @Body()
    taskData: ITaskUpdate,
  ): Promise<Task> {
    return this.taskService.updateTask(req.user['sub'], taskId, taskData);
  }

  @UseGuards(AccessTokenGuard)
  @Delete('delete/:taskId')
  async delete(
    @Req() req: Request,
    @Param('taskId') taskId: string,
  ): Promise<Task> {
    return this.taskService.deleteTask(req.user['sub'], taskId);
  }

  @UseGuards(AccessTokenGuard)
  @Get('/to-do')
  async fetchToDOs(@Req() req: Request): Promise<Task[] | null> {
    return this.taskService.fetchTasks(req.user['sub'], 'To do');
  }

  @UseGuards(AccessTokenGuard)
  @Get('/in-progress')
  async fetchInProgress(@Req() req: Request): Promise<Task[] | null> {
    return this.taskService.fetchTasks(req.user['sub'], 'In progress');
  }

  @UseGuards(AccessTokenGuard)
  @Get('/completed')
  async fetchCompleted(@Req() req: Request): Promise<Task[] | null> {
    return this.taskService.fetchTasks(req.user['sub'], 'Completed');
  }

  @UseGuards(AccessTokenGuard)
  @Patch('/re-order')
  async reOrderInSamaColumn(
    @Req() req: Request,
    @Body() data: IOrderSameColumn,
  ): Promise<Task[] | null> {
    return this.taskService.reOrderInSamaColumn(req.user['sub'], data);
  }

  @UseGuards(AccessTokenGuard)
  @Patch('/re-order-2')
  async reOrderNotInSamaColumn(
    @Req() req: Request,
    @Body()
    data: IOrderDifferentColumns,
  ) {
    return this.taskService.reOrderNotInSamaColumn(req.user['sub'], data);
  }
}
