import type { CartItem } from "@/stores/cartStore";

const ORDER_STORAGE_KEY = "ff-admin-orders";

export interface OrderMetricRecord {
  id: string;
  externalId?: string;
  createdAt: string;
  customerEmail: string | null;
  totalAmount: number;
  currencyCode: string;
  itemCount: number;
}

const readRecords = (): OrderMetricRecord[] => {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as OrderMetricRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecords = (records: OrderMetricRecord[]) => {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(records));
};

export const listOrderMetricRecords = (): OrderMetricRecord[] => readRecords();

export const persistSuccessfulOrder = (input: {
  externalId?: string;
  customerEmail: string | null;
  cartItems: CartItem[];
}) => {
  const records = readRecords();

  if (input.externalId && records.some((record) => record.externalId === input.externalId)) {
    return;
  }

  const totalAmount = input.cartItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0,
  );

  const itemCount = input.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const currencyCode = input.cartItems[0]?.currencyCode ?? "USD";

  if (totalAmount <= 0 || itemCount <= 0) return;

  const record: OrderMetricRecord = {
    id: crypto.randomUUID(),
    externalId: input.externalId,
    createdAt: new Date().toISOString(),
    customerEmail: input.customerEmail,
    totalAmount,
    currencyCode,
    itemCount,
  };

  writeRecords([record, ...records]);
};
