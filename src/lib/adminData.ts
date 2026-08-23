import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { User } from "@supabase/supabase-js";

export type InventoryProduct = Database["public"]["Tables"]["inventory_products"]["Row"];
export type OrderRecord = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItemRecord = Database["public"]["Tables"]["order_items"]["Row"];
export type CustomerProfile = Database["public"]["Tables"]["customer_profiles"]["Row"];
export type UserSessionRecord = Database["public"]["Tables"]["user_sessions"]["Row"];

export type DashboardMetrics = {
  totalSales: number;
  totalOrders: number;
  activeUsers: number;
  currencyCode: string;
};

type ProductImage = {
  url: string;
  altText: string;
};

const PRODUCT_ASSETS_BUCKET = "product-assets";

const sanitizePathPart = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  if (!supabase) {
    return { totalSales: 0, totalOrders: 0, activeUsers: 0, currencyCode: "USD" };
  }

  const { data, error } = await supabase
    .from("orders")
    .select("total_amount, currency_code, customer_email");

  if (error) throw error;

  const rows = data ?? [];
  const totalSales = rows.reduce((sum, row) => sum + Number(row.total_amount), 0);
  const totalOrders = rows.length;
  const activeUsers = new Set(rows.map((r) => r.customer_email).filter(Boolean)).size;
  const currencyCode = rows[0]?.currency_code ?? "USD";

  return { totalSales, totalOrders, activeUsers, currencyCode };
};

export const createOrderRecord = async (input: {
  externalId?: string;
  stripePaymentIntentId?: string;
  clientOrderToken?: string;
  customerEmail: string | null;
  totalAmount: number;
  currencyCode: string;
  itemCount: number;
}): Promise<string | null> => {
  if (!supabase) return null;

  const payload: Database["public"]["Tables"]["orders"]["Insert"] = {
    external_id: input.externalId ?? null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? input.externalId ?? null,
    client_order_token: input.clientOrderToken ?? null,
    customer_email: input.customerEmail,
    total_amount: Number(input.totalAmount.toFixed(2)),
    currency_code: input.currencyCode,
    item_count: input.itemCount,
    status: "pending",
    updated_at: new Date().toISOString(),
  };

  const query = input.externalId
    ? supabase.from("orders").upsert(payload, { onConflict: "external_id" })
    : supabase.from("orders").insert(payload);

  const { data, error } = await query.select("id").maybeSingle();

  // Ignore duplicate external checkout record attempts (refresh on success page).
  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    throw error;
  }

  if (data?.id) {
    return data.id;
  }

  const selector = input.clientOrderToken
    ? supabase.from("orders").select("id").filter("client_order_token", "eq", input.clientOrderToken)
    : input.externalId
      ? supabase.from("orders").select("id").or(`stripe_payment_intent_id.eq.${input.stripePaymentIntentId ?? input.externalId},external_id.eq.${input.externalId}`)
      : null;

  if (!selector) return null;

  const { data: fallbackData } = await selector.maybeSingle();

  return fallbackData?.id ?? null;
};

export const upsertOrderItems = async (
  orderId: string,
  items: Array<{
    productHandle: string;
    productTitle: string;
    variantId: string | null;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    currencyCode: string;
  }>,
) => {
  if (!supabase || items.length === 0) return;

  const { error } = await supabase
    .from("order_items")
    .upsert(
      items.map((item) => ({
        order_id: orderId,
        product_handle: item.productHandle,
        product_title: item.productTitle,
        variant_id: item.variantId,
        image_url: item.imageUrl,
        unit_price: Number(item.unitPrice.toFixed(2)),
        quantity: item.quantity,
        currency_code: item.currencyCode,
      })),
      { onConflict: "order_id,product_handle" },
    );

  if (error) throw error;
};

export const fetchInventoryProducts = async (): Promise<InventoryProduct[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("inventory_products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
};

export const fetchOrders = async (): Promise<OrderRecord[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
};

export const fetchOrderItems = async (): Promise<OrderItemRecord[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data ?? [];
};
export const fetchCustomerProfiles = async (): Promise<CustomerProfile[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
};

export const fetchUserSessions = async (): Promise<UserSessionRecord[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .order("last_seen_at", { ascending: false });

  if (error) throw error;

  return data ?? [];
};

export const upsertOwnCustomerProfile = async (user: User) => {
  if (!supabase) return;

  const email = user.email?.trim().toLowerCase();
  if (!email) return;

  const firstName = (user.user_metadata?.first_name as string | undefined)?.trim() || null;
  const lastName = (user.user_metadata?.last_name as string | undefined)?.trim() || null;

  const { error } = await supabase
    .from("customer_profiles")
    .upsert(
      {
        id: user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        last_sign_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) throw error;
};

export const revokeUserSession = async (input: { sessionRecordId: string; reason?: string | null }) => {
  if (!supabase) return;

  const { error } = await supabase.rpc("revoke_user_session", {
    p_session_record_id: input.sessionRecordId,
    p_reason: input.reason ?? null,
  });

  if (error) throw error;
};

export const revokeAllUserSessions = async (input: { userId: string; reason?: string | null }) => {
  if (!supabase) return 0;

  const { data, error } = await supabase.rpc("revoke_all_user_sessions", {
    p_target_user_id: input.userId,
    p_reason: input.reason ?? null,
  });

  if (error) throw error;

  return typeof data === "number" ? data : 0;
};

export const updateOrderStatus = async (input: {
  id: string;
  status: "pending" | "processing" | "fulfilled" | "cancelled";
}) => {
  if (!supabase) return;

  const payload = {
    status: input.status,
    fulfilled_at: input.status === "fulfilled" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", input.id);

  if (error) throw error;
};

export const updateOrderTracking = async (input: {
  id: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  trackingSentAt?: string | null;
}) => {
  if (!supabase) return;

  const payload: Database["public"]["Tables"]["orders"]["Update"] = {
    tracking_number: input.trackingNumber,
    tracking_carrier: input.trackingCarrier,
    tracking_url: input.trackingUrl,
    updated_at: new Date().toISOString(),
  };

  if (input.trackingSentAt !== undefined) {
    payload.tracking_sent_at = input.trackingSentAt;
  }

  const { error } = await supabase.from("orders").update(payload).eq("id", input.id);

  if (error) throw error;
};

export const cancelAndRefundOrder = async (input: { id: string }) => {
  if (!supabase) return;

  const { data, error } = await supabase.functions.invoke("refund-order", {
    body: { orderId: input.id },
  });

  if (error) {
    let message = error.message;

    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const payload = await response.clone().json() as { error?: unknown };
        if (payload?.error) {
          message = String(payload.error);
        }
      } catch {
        // Fall back to the generic invoke error message.
      }
    }

    throw new Error(message);
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }

  return data as {
    refunded?: boolean;
    refundId?: string | null;
    paymentIntentId?: string | null;
    orderId?: string;
    status?: string;
    refundStatus?: "refunded" | "already_refunded" | "payment_cancelled" | "not_attempted";
    warning?: string | null;
  };
};

export const updateInventoryProduct = async (input: {
  id: string;
  handle: string;
  title: string;
  description: string;
  fullDescription: string | null;
  price: number;
  availableForSale: boolean;
  currencyCode: string;
  images: ProductImage[];
  variantId: string;
  capColor: string;
  fillColor: string | null;
  model3dUrl: string | null;
  enable3dViewer: boolean;
  upc: string | null;
}) => {
  if (!supabase) return;

  const { error } = await supabase
    .from("inventory_products")
    .update({
      handle: input.handle,
      title: input.title,
      description: input.description,
      full_description: input.fullDescription,
      price: Number(input.price.toFixed(2)),
      available_for_sale: input.availableForSale,
      currency_code: input.currencyCode,
      images: input.images,
      variant_id: input.variantId,
      cap_color: input.capColor,
      fill_color: input.fillColor,
      model_3d_url: input.model3dUrl,
      enable_3d_viewer: input.enable3dViewer,
      upc: input.upc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) throw error;
};

export const createInventoryProduct = async (input: {
  handle: string;
  title: string;
  description: string;
  fullDescription: string | null;
  price: number;
  currencyCode: string;
  availableForSale: boolean;
  images: ProductImage[];
  variantId: string;
  capColor: string;
  fillColor: string | null;
  model3dUrl: string | null;
  enable3dViewer: boolean;
  upc: string | null;
}) => {
  if (!supabase) return;

  const { error } = await supabase.from("inventory_products").insert({
    handle: input.handle,
    title: input.title,
    description: input.description,
    full_description: input.fullDescription,
    price: Number(input.price.toFixed(2)),
    currency_code: input.currencyCode,
    available_for_sale: input.availableForSale,
    images: input.images,
    variant_id: input.variantId,
    cap_color: input.capColor,
    fill_color: input.fillColor,
    model_3d_url: input.model3dUrl,
    enable_3d_viewer: input.enable3dViewer,
    upc: input.upc,
  });

  if (error) throw error;
};

export const uploadProductAsset = async (input: {
  productHandle: string;
  file: File;
  kind: "image" | "model";
}) => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const extension = input.file.name.split(".").pop()?.toLowerCase() || "bin";
  const handle = sanitizePathPart(input.productHandle);
  const base = sanitizePathPart(input.file.name.replace(/\.[^.]+$/, "")) || "asset";
  const folder = input.kind === "image" ? "images" : "models";
  const path = `${handle}/${folder}/${Date.now()}-${base}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_ASSETS_BUCKET)
    .upload(path, input.file, {
      upsert: false,
      contentType: input.file.type || undefined,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(PRODUCT_ASSETS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
};

export const deleteInventoryProduct = async (id: string) => {
  if (!supabase) return;

  const { error } = await supabase
    .from("inventory_products")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

export const updateInventoryProductSortOrders = async (input: Array<{ id: string; sortOrder: number }>) => {
  if (!supabase || input.length === 0) return;

  const updates = input.map((item) =>
    supabase
      .from("inventory_products")
      .update({ sort_order: item.sortOrder, updated_at: new Date().toISOString() })
      .eq("id", item.id),
  );

  const results = await Promise.all(updates);
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;
};
