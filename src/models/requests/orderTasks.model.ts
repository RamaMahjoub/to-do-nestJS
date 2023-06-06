/* eslint-disable prettier/prettier */
import { Task } from "@prisma/client";

export interface IOrderSameColumn {
  columnTitle: string;
  source: number;
  destination: number;
}

export interface IOrderDifferentColumns {
  columnSource: string;
  columnDestination: string;
  sourceTasks: Array<Task>;
  destinationTasks: Array<Task>;
  source: number;
  destination: number;
}
