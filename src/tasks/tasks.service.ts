/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Task } from '@prisma/client';
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
    return this.prisma.task.delete({ where: { id: taskId } });
  }

  async fetchTasks(userId: string, status: string): Promise<Task[] | null> {
    return this.prisma.task.findMany({ where: { userId, status } });
  }

  async reOrderInSamaColumn(userId, data): Promise<Task[] | null> {
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

    return await this.fetchTasks(userId, columnTitle);
  }

  async reOrderNotInSamaColumn(userId, data) {
    const {
      columnSource,
      columnDestination,
      sourceTasks,
      destinationTasks,
      source,
      destination,
    } = data;

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
