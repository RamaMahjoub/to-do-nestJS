/* eslint-disable prettier/prettier */
export interface ITaskCreate {
  title: string;
  description?: string | null;
  status: string;
  priority: string;
}

export interface ITaskUpdate {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    order?: number;
  }
