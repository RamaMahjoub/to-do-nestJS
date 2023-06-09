/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Task } from '@prisma/client';
import {
  IOrderDifferentColumns,
  IOrderSameColumn,
} from 'src/models/requests/orderTasks.model';
import { ITaskCreate, ITaskUpdate } from 'src/models/requests/task.model';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async createTask(userId: string, data: ITaskCreate): Promise<Task> {
    const maxOrder = await this.prisma.task.findFirst({
      select: {
        order: true,
      },
      where: {
        status: data.status,
      },
      orderBy: {
        order: 'desc',
      },
    });

    const newOrder = maxOrder ? maxOrder.order + 1 : 1;
    return this.prisma.task.create({
      data: {
        ...data,
        userId,
        order: newOrder,
      },
    });
  }

  async updateTask(
    userId: string,
    taskId: string,
    data: ITaskUpdate,
  ): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (task.userId !== userId) {
      throw new UnauthorizedException('You can not update this task');
    }
    return this.prisma.task.update({
      where: { id: taskId },
      data: { ...data },
    });
  }

  async deleteTask(userId: string, taskId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (task.userId !== userId) {
      throw new UnauthorizedException('You can not update this task');
    }
    const tasks = await this.fetchTasks(userId, task.status);
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].order > task.order)
        this.updateTask(userId, tasks[i].id, { order: tasks[i].order - 1 });
    }
    return this.prisma.task.delete({ where: { id: taskId } });
  }

  async fetchTasks(userId: string, status: string): Promise<Task[] | null> {
    return await this.prisma.task.findMany({
      orderBy: {
        order: 'asc',
      },
      where: { userId, status },
    });
  }

  async reOrderInSamaColumn(
    userId: string,
    data: IOrderSameColumn,
  ): Promise<Task[] | null> {
    const { columnTitle, source, destination } = data;
    const tasks: Task[] | null = await this.fetchTasks(userId, columnTitle);
    const sourceTask: Task = await this.prisma.task.findFirst({
      where: { userId, status: columnTitle, order: source },
    });

    tasks.map(async (task) => {
      if (source < destination) {
        if (task.order > source && task.order <= destination) {
          await this.updateTask(userId, task.id, { order: task.order - 1 });
        }
      } else if (source > destination) {
        if (task.order < source && task.order >= destination) {
          await this.updateTask(userId, task.id, { order: task.order + 1 });
        }
      }
    });
    await this.updateTask(userId, sourceTask.id, { order: destination });

    const dat = await this.fetchTasks(userId, columnTitle);
    console.log('daaaaaaaaaaata', await this.fetchTasks(userId, columnTitle));
    return dat;
  }

  async reOrderNotInSamaColumn(userId: string, data: IOrderDifferentColumns) {
    const {
      columnSource,
      columnDestination,
      sourceTasks,
      destinationTasks,
      source,
      destination,
    } = data;

    console.log('dataaaaaaaaaaa', data);
    const sourceTask: Task = await this.prisma.task.findFirst({
      where: { userId, status: columnSource, order: source },
    });

    sourceTasks.map(async (task) => {
      if (task.order > source) {
        await this.updateTask(userId, task.id, { order: task.order - 1 });
      }
    });

    destinationTasks.map(async (task) => {
      if (task.order >= destination) {
        await this.updateTask(userId, task.id, { order: task.order + 1 });
      }
    });
    await this.updateTask(userId, sourceTask.id, {
      status: columnDestination,
      order: destination,
    });

    const sourceReturn = await this.fetchTasks(userId, columnSource),
      destReturn = await this.fetchTasks(userId, columnDestination);

    return { sourceReturn, destReturn };
  }
}
