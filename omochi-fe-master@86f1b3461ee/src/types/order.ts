import { OrderStatusEnum } from "@/utils/constants";

export type StatusDisplayItem = {
  status: OrderStatusEnum;
  label: string;
  completed: boolean;
  completedAt?: string;
  keyIcon?: string;
};

export type PromiseWithMetadata = {
  promise: Promise<unknown>;
  orderIds?: string[];
  reservationIds?: string[];
};
