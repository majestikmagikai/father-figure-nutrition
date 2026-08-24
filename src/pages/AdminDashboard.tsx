import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { UPCScannerModal } from "@/components/UPCScannerModal";
import {
  ArrowLeft,
  BarChart3,
  GripVertical,
  LogOut,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  type CustomerProfile,
  createInventoryProduct,
  cancelAndRefundOrder,
  deleteInventoryProduct,
  fetchCustomerProfiles,
  fetchDashboardMetrics,
  fetchInventoryProducts,
  fetchOrderItems,
  fetchOrders,
  fetchUserSessions,
  type InventoryProduct,
  type OrderItemRecord,
  type OrderRecord,
  type UserSessionRecord,
  revokeAllUserSessions,
  revokeUserSession,
  uploadProductAsset,
  updateInventoryProductSortOrders,
  updateOrderTracking,
  updateOrderStatus,
  updateInventoryProduct,
} from "@/lib/adminData";
import { convertImageFileToWebp } from "@/lib/imageUtils";
import {
  type Bundle,
  createBundle,
  deleteBundle,
  fetchAllBundles,
  updateBundle,
  type BundleInput,
} from "@/lib/bundles";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: "default" | "fieldManual";
};

type HexColorInputProps = {
  value: string;
  onChange: (color: string) => void;
  placeholder: string;
  fallbackColor: string;
};

type RevokeAccessTarget =
  | { kind: "session"; sessionRecord: UserSessionRecord }
  | { kind: "user"; userId: string; email: string; activeSessionCount: number };

type CancelRefundTarget = {
  order: OrderRecord;
};

type AdminInventoryProduct = InventoryProduct & { enable_3d_viewer?: boolean; upc?: string | null };

type ProductDeleteTarget = {
  product: AdminInventoryProduct;
};

type RemoveImageTarget = {
  product: AdminInventoryProduct;
  index: number;
  url: string;
};

const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value.trim());

const HexColorInput = ({ value, onChange, placeholder, fallbackColor }: HexColorInputProps) => {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const pickerColor = isHexColor(value) ? value.trim() : fallbackColor;

  return (
    <div className="relative">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={() => pickerRef.current?.click()}
        className="pr-12 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => pickerRef.current?.click()}
        className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded border border-navy/20"
        aria-label="Open color palette"
        title="Open color palette"
      >
        <span className="h-5 w-5 rounded-sm border border-black/10" style={{ backgroundColor: pickerColor }} />
      </button>
      <input
        ref={pickerRef}
        type="color"
        value={pickerColor}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
};

const RichTextEditor = ({ value, onChange, placeholder, variant = "default" }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  const runCommand = (command: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command);
    onChange(editor.innerHTML);
  };

  const runHeading = (tag: "H2" | "H3" | "P") => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand("formatBlock", false, tag);
    onChange(editor.innerHTML);
  };

  const insertLink = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const rawUrl = window.prompt("Enter URL", "https://");
    if (!rawUrl) return;
    const url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Please enter a valid http(s) URL.");
      return;
    }
    document.execCommand("createLink", false, url);
    onChange(editor.innerHTML);
  };

  const containerClass =
    variant === "fieldManual"
      ? "rounded-lg border border-[#d8c7a1] bg-[#f9f2e4] shadow-sm"
      : "rounded-md border border-input bg-background";

  const toolbarClass =
    variant === "fieldManual"
      ? "flex flex-wrap gap-2 border-b border-[#d8c7a1] bg-[#efe2c8] p-2"
      : "flex flex-wrap gap-2 border-b border-input p-2";

  const editorClass =
    variant === "fieldManual"
      ? "min-h-28 p-3 text-sm leading-relaxed text-navy/90 focus:outline-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-2 [&_a]:text-orange [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
      : "min-h-28 p-3 text-sm leading-relaxed focus:outline-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-2 [&_a]:text-orange [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1";

  return (
    <div className={containerClass}>
      <div className={toolbarClass}>
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("bold")}>
          Bold
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("italic")}>
          Italic
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("underline")}>
          Underline
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("insertUnorderedList")}>
          Bullet List
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runHeading("H2")}>
          H2
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runHeading("H3")}>
          H3
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runHeading("P")}>
          Paragraph
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={insertLink}>
          Link
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => runCommand("unlink")}>
          Unlink
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={editorClass}
        onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder ?? "Type description..."}
      />
    </div>
  );
};

const AdminDashboard = () => {
  const { section, productHandle } = useParams<{ section?: string; productHandle?: string }>();
  const currentSection = section ?? "overview";
  const isOverview = currentSection === "overview";
  const isMetricsSection = currentSection === "metrics";
  const isProductsSection = currentSection === "products";
  const isProductEditSection = currentSection === "product-edit";
  const isOrdersSection = currentSection === "orders";
  const isUsersSection = currentSection === "users";
  const isBundlesSection = currentSection === "bundles";
  const isInsightsSection = currentSection === "insights";
  const isEditingNewProduct = isProductEditSection && productHandle === "new";

  const parseImagesInput = (value: string) => {
    try {
      const parsed = JSON.parse(value) as Array<{ url?: unknown; altText?: unknown }>;
      if (!Array.isArray(parsed)) return null;

      const normalized = parsed
        .filter((entry) => typeof entry?.url === "string" && typeof entry?.altText === "string")
        .map((entry) => ({
          url: String(entry.url),
          altText: String(entry.altText),
        }));

      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
  };

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState<string | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);
  const [isUploadingImageFor, setIsUploadingImageFor] = useState<string | null>(null);
  const [isUploadingModelFor, setIsUploadingModelFor] = useState<string | null>(null);
  const [isSavingSortOrder, setIsSavingSortOrder] = useState(false);
  const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(10);
  const [orderSort, setOrderSort] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc" | "status">("newest");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [isSavingOrder, setIsSavingOrder] = useState<string | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<AdminInventoryProduct[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRecord[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([]);
  const [userSessions, setUserSessions] = useState<UserSessionRecord[]>([]);
  const [refundOutcomeByOrderId, setRefundOutcomeByOrderId] = useState<
    Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }>
  >({});
  const [isRevokingSessionId, setIsRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAllForUserId, setIsRevokingAllForUserId] = useState<string | null>(null);
  const [isDeletingSessionId, setIsDeletingSessionId] = useState<string | null>(null);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<UserSessionRecord | null>(null);
  const [isDeletingOrderId, setIsDeletingOrderId] = useState<string | null>(null);
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<OrderRecord | null>(null);
  const [revokeAccessTarget, setRevokeAccessTarget] = useState<RevokeAccessTarget | null>(null);
  const [cancelRefundTarget, setCancelRefundTarget] = useState<CancelRefundTarget | null>(null);
  const [productDeleteTarget, setProductDeleteTarget] = useState<ProductDeleteTarget | null>(null);
  const [removeImageTarget, setRemoveImageTarget] = useState<RemoveImageTarget | null>(null);
  const [scanningOrder, setScanningOrder] = useState<OrderRecord | null>(null);
  const [sessionPages, setSessionPages] = useState<Record<string, number>>({});
  const [usersPage, setUsersPage] = useState(1);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [isSavingBundle, setIsSavingBundle] = useState(false);
  const [isDeletingBundleId, setIsDeletingBundleId] = useState<string | null>(null);
  const [bundleDeleteTarget, setBundleDeleteTarget] = useState<Bundle | null>(null);
  const [bundleForm, setBundleForm] = useState({
    handle: "",
    name: "",
    description: "",
    discountType: "fixed" as "fixed" | "percentage",
    discountValue: "0.00",
    currencyCode: "USD",
    productHandles: [] as string[],
    tag: "",
    active: true,
    sortOrder: 0,
  });

  const { originalPrice, finalPrice, discountAmount } = useMemo(() => {
    if (bundleForm.productHandles.length === 0) {
      return { originalPrice: 0, finalPrice: 0, discountAmount: 0 };
    }

    const bundleProducts = products.filter((p) => bundleForm.productHandles.includes(p.handle));
    const original = bundleProducts.reduce((sum, p) => sum + Number(p.price), 0);

    const discountValue = Number.parseFloat(bundleForm.discountValue);
    if (Number.isNaN(discountValue) || discountValue < 0) {
      return { originalPrice: original, finalPrice: original, discountAmount: 0 };
    }

    let final = original;
    let discount = 0;
    if (bundleForm.discountType === "fixed") {
      discount = discountValue;
      final = original - discountValue;
    } else {
      discount = original * (discountValue / 100);
      final = original - discount;
    }

    return { originalPrice: original, finalPrice: Math.max(0, final), discountAmount: discount };
  }, [bundleForm.productHandles, bundleForm.discountType, bundleForm.discountValue, products]);

  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeUsers: 0,
    currencyCode: "USD",
  });
  const [newProduct, setNewProduct] = useState({
    category: "supplement",
    handle: "",
    title: "",
    description: "",
    fullDescription: "",
    price: "0.00",
    currencyCode: "USD",
    availableForSale: true,
    imagesJson: "[]",
    variantId: "",
    capColor: "#f5f5f5",
    fillColor: "",
    model3dUrl: "",
    enable3dViewer: false,
    upc: "",
  });

  const handleSessionPageChange = (userId: string, page: number) => {
    setSessionPages((prev) => ({ ...prev, [userId]: page }));
  };

  const resetBundleForm = () => {
    setEditingBundleId(null);
    setBundleForm({
      handle: "",
      name: "",
      description: "",
      discountType: "fixed" as "fixed" | "percentage",
      discountValue: "0.00",
      currencyCode: "USD",
      productHandles: [],
      tag: "",
      active: true,
      sortOrder: bundles.length,
    });
  };

  const handleEditBundle = (bundle: Bundle) => {
    setEditingBundleId(bundle.id);
    setBundleForm({
      handle: bundle.handle,
      name: bundle.name,
      description: bundle.description ?? "",
      discountType: bundle.discount_type ?? "fixed",
      discountValue: (bundle.discount_value ?? 0).toFixed(2),
      currencyCode: bundle.currency_code,
      productHandles: [...bundle.product_handles],
      tag: bundle.tag ?? "",
      active: bundle.active,
      sortOrder: bundle.sort_order,
    });
  };

  const handleToggleBundleProductHandle = (handle: string) => {
    setBundleForm((prev) => ({
      ...prev,
      productHandles: prev.productHandles.includes(handle)
        ? prev.productHandles.filter((h) => h !== handle)
        : [...prev.productHandles, handle],
    }));
  };

  const handleSaveBundle = async () => {
    const handle = bundleForm.handle.trim().toLowerCase();
    const name = bundleForm.name.trim();
    const description = bundleForm.description.trim();
    const parsedDiscountValue = Number.parseFloat(bundleForm.discountValue);
    const discountType = bundleForm.discountType;
    const currencyCode = bundleForm.currencyCode.trim().toUpperCase() || "USD";
    const tag = bundleForm.tag.trim();

    if (!/^[a-z0-9-]+$/.test(handle)) {
      toast.error("Bundle handle must contain lowercase letters, numbers, or hyphens.");
      return;
    }
    if (name.length < 2) {
      toast.error("Bundle name must be at least 2 characters.");
      return;
    }
    if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue < 0) {
      toast.error("Discount value must be a valid non-negative number.");
      return;
    }
    if (bundleForm.productHandles.length < 2) {
      toast.error("Select at least two products for the bundle.");
      return;
    }

    const bundleProducts = products.filter((p) => bundleForm.productHandles.includes(p.handle));
    const originalTotalPrice = bundleProducts.reduce((sum, p) => sum + Number(p.price), 0);

    let calculatedFinalPrice = 0;
    if (discountType === "fixed") {
      calculatedFinalPrice = originalTotalPrice - parsedDiscountValue;
    } else {
      calculatedFinalPrice = originalTotalPrice * (1 - parsedDiscountValue / 100);
    }

    if (calculatedFinalPrice < 0) {
      toast.error("Discount results in a negative price. Please adjust.");
      return;
    }

    // Prevent saving if the handle is already used by another bundle.
    const isHandleTaken = bundles.some(
      (bundle) => bundle.handle.toLowerCase() === handle && bundle.id !== editingBundleId,
    );

    if (isHandleTaken) {
      toast.error("Bundle handle is already in use. Please choose a unique handle.");
      return;
    }

    setIsSavingBundle(true);
    try {
      const input: BundleInput = {
        handle,
        name,
        description: description || null,
        price: calculatedFinalPrice,
        currencyCode,
        productHandles: bundleForm.productHandles,
        tag: tag || null,
        active: bundleForm.active,
        sortOrder: bundleForm.sortOrder,
        discountType,
        discountValue: parsedDiscountValue,
      };

      if (editingBundleId) {
        await updateBundle(editingBundleId, input);
        toast.success("Bundle updated.");
      } else {
        await createBundle(input);
        toast.success("Bundle added.");
      }

      resetBundleForm();
      await reloadAdminData();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string"
          ? (err as { message: string }).message
          : "An unexpected error occurred.";

      const isDuplicateHandle = message.includes("duplicate key") || message.includes("bundles_handle_key");

      if (isDuplicateHandle) {
        toast.error("Could not save bundle. The handle is already in use. Please refresh and try a different handle.");
      } else {
        toast.error(`Could not save bundle: ${message}`);
      }
    } finally {
      setIsSavingBundle(false);
    }
  };

  const openBundleDeleteModal = (bundle: Bundle) => {
    setBundleDeleteTarget(bundle);
  };

  const confirmDeleteBundle = async () => {
    if (!bundleDeleteTarget) return;

    const target = bundleDeleteTarget;
    setBundleDeleteTarget(null);
    setIsDeletingBundleId(target.id);

    try {
      await deleteBundle(target.id);
      toast.success("Bundle deleted.");
      if (editingBundleId === target.id) resetBundleForm();
      await reloadAdminData();
    } catch {
      toast.error("Could not delete bundle.");
    } finally {
      setIsDeletingBundleId(null);
    }
  };

  const openDeleteOrderModal = (order: OrderRecord) => {
    setDeleteOrderTarget(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteOrderTarget) return;

    const target = deleteOrderTarget;
    setDeleteOrderTarget(null);
    setIsDeletingOrderId(target.id);

    try {
      await supabase.from("order_items").delete().eq("order_id", target.id);
      const { error } = await supabase.from("orders").delete().eq("id", target.id);

      if (error) throw error;

      toast.success("Order record deleted.");
      await reloadAdminData({ silent: true });
    } catch {
      toast.error("Could not delete order record.");
    } finally {
      setIsDeletingOrderId(null);
    }
  };

  const openDeleteSessionModal = (sessionRecord: UserSessionRecord) => {
    setDeleteSessionTarget(sessionRecord);
  };

  const confirmDeleteSession = async () => {
    if (!deleteSessionTarget) return;

    const target = deleteSessionTarget;
    setDeleteSessionTarget(null);
    setIsDeletingSessionId(target.id);

    try {
      const { error } = await supabase
        .from("user_sessions")
        .delete()
        .eq("id", target.id);

      if (error) throw error;

      toast.success("Session record deleted.");
      await reloadAdminData({ silent: true });
    } catch {
      toast.error("Could not delete session record.");
    } finally {
      setIsDeletingSessionId(null);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;

    const syncUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setUser(data.session?.user ?? null);
    };

    syncUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const reloadAdminData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoadingData(true);
    }
    try {
      const [nextMetrics, nextProductsRaw, nextOrders, nextOrderItems, nextCustomerProfiles, nextUserSessions, nextBundles] = await Promise.all([
        fetchDashboardMetrics(),
        fetchInventoryProducts(),
        fetchOrders(),
        fetchOrderItems(),
        fetchCustomerProfiles(),
        fetchUserSessions(),
        fetchAllBundles(),
      ]);

      setMetrics(nextMetrics);
      setProducts(nextProductsRaw);
      setOrders(nextOrders);
      setOrderItems(nextOrderItems);
      setCustomerProfiles(nextCustomerProfiles);
      setUserSessions(nextUserSessions);
      setBundles(nextBundles);
    } catch {
      if (!silent) {
        toast.error("Could not load dashboard data from Supabase.");
      }
    } finally {
      if (!silent) {
        setIsLoadingData(false);
      }
    }
  };

  const handleSaveOrderStatus = async (order: OrderRecord) => {
    const trackingNumber = (order.tracking_number ?? "").trim();
    const trackingCarrier = (order.tracking_carrier ?? "").trim();
    const trackingUrl = (order.tracking_url ?? "").trim();

    if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
      toast.error("Tracking URL must be a valid http(s) URL.");
      return;
    }

    setIsSavingOrder(order.id);
    try {
      await updateOrderStatus({
        id: order.id,
        status: order.status as "pending" | "processing" | "fulfilled" | "cancelled",
      });
      const trackingSentAt = trackingNumber
        ? order.tracking_sent_at ?? new Date().toISOString()
        : null;
      await updateOrderTracking({
        id: order.id,
        trackingNumber: trackingNumber || null,
        trackingCarrier: trackingCarrier || null,
        trackingUrl: trackingUrl || null,
        trackingSentAt,
      });
      toast.success("Order updated.");
      await reloadAdminData();
    } catch {
      toast.error("Could not update order.");
    } finally {
      setIsSavingOrder(null);
    }
  };

  const handleMarkFulfilled = async (order: OrderRecord) => {
    setIsSavingOrder(order.id);
    try {
      await updateOrderStatus({ id: order.id, status: "fulfilled" });
      toast.success("Order marked fulfilled.");
      await reloadAdminData();
    } catch {
      toast.error("Could not mark order fulfilled.");
    } finally {
      setIsSavingOrder(null);
    }
  };

  const handleSendTrackingEmail = async (order: OrderRecord) => {
    const customerEmail = (order.customer_email ?? "").trim();
    const trackingNumber = (order.tracking_number ?? "").trim();
    const trackingUrl = (order.tracking_url ?? "").trim();
    const trackingCarrier = (order.tracking_carrier ?? "").trim();

    if (!customerEmail) {
      toast.error("This order has no customer email.");
      return;
    }
    if (!trackingNumber) {
      toast.error("Add a tracking number before sending.");
      return;
    }
    if (trackingUrl && !/^https?:\/\//i.test(trackingUrl)) {
      toast.error("Tracking URL must be a valid http(s) URL.");
      return;
    }

    setIsSavingOrder(order.id);
    try {
      await updateOrderTracking({
        id: order.id,
        trackingNumber,
        trackingCarrier: trackingCarrier || null,
        trackingUrl: trackingUrl || null,
        trackingSentAt: new Date().toISOString(),
      });

      const subject = encodeURIComponent(`Your Father Figure order tracking: ${trackingNumber}`);
      const bodyLines = [
        "Hi,",
        "",
        "Your order has shipped.",
        trackingCarrier ? `Carrier: ${trackingCarrier}` : null,
        `Tracking number: ${trackingNumber}`,
        trackingUrl ? `Track shipment: ${trackingUrl}` : null,
        "",
        "Thank you for choosing Father Figure.",
      ].filter(Boolean);

      const body = encodeURIComponent(bodyLines.join("\n"));
      window.location.href = `mailto:${encodeURIComponent(customerEmail)}?subject=${subject}&body=${body}`;

      toast.success("Tracking email draft opened.");
      await reloadAdminData();
    } catch {
      toast.error("Could not send tracking details.");
    } finally {
      setIsSavingOrder(null);
    }
  };

  const handleCancelAndRefundOrder = async (order: OrderRecord) => {
    setIsSavingOrder(order.id);
    try {
      const result = await cancelAndRefundOrder({ id: order.id });
      setOrders((prev) => prev.map((currentOrder) => (currentOrder.id === order.id ? { ...currentOrder, status: "cancelled" } : currentOrder)));

      const nextOutcome = (() => {
        if (result?.refundStatus === "refunded") {
          return { label: "Refunded in Stripe", tone: "success" as const };
        }
        if (result?.refundStatus === "already_refunded") {
          return { label: "Already refunded", tone: "neutral" as const };
        }
        if (result?.refundStatus === "payment_cancelled") {
          return { label: "Authorization cancelled", tone: "warning" as const };
        }
        if (result?.warning) {
          return { label: "Refund warning", tone: "danger" as const };
        }
        return { label: "Refund status unknown", tone: "neutral" as const };
      })();

      setRefundOutcomeByOrderId((prev) => ({
        ...prev,
        [order.id]: nextOutcome,
      }));

      if (result?.warning) {
        toast.error(result.warning);
      } else if (result?.refundStatus === "refunded") {
        toast.success("Order cancelled and refunded.");
      } else if (result?.refundStatus === "already_refunded") {
        toast.success("Order cancelled. Payment was already refunded.");
      } else if (result?.refundStatus === "payment_cancelled") {
        toast.success("Order cancelled. Payment authorization was cancelled (no captured funds). ");
      } else {
        toast.success("Order cancelled.");
      }

      await reloadAdminData();
    } catch (error) {
      setRefundOutcomeByOrderId((prev) => ({
        ...prev,
        [order.id]: { label: "Refund failed", tone: "danger" },
      }));
      const message = error instanceof Error ? error.message : "Could not cancel and refund order.";
      toast.error(message);
      await reloadAdminData({ silent: true });
    } finally {
      setIsSavingOrder(null);
    }
  };

  const openCancelRefundModal = (order: OrderRecord) => {
    setCancelRefundTarget({ order });
  };

  const confirmCancelAndRefund = async () => {
    if (!cancelRefundTarget) return;

    const target = cancelRefundTarget;
    setCancelRefundTarget(null);
    await handleCancelAndRefundOrder(target.order);
  };

  const handleRevokeSession = async (sessionRecord: UserSessionRecord) => {
    setIsRevokingSessionId(sessionRecord.id);
    try {
      await revokeUserSession({
        sessionRecordId: sessionRecord.id,
        reason: "Revoked by admin",
      });
      toast.success("Session revoked.");
      await reloadAdminData({ silent: true });
    } catch {
      toast.error("Could not revoke session.");
    } finally {
      setIsRevokingSessionId(null);
    }
  };

  const handleRevokeAllSessionsForUser = async (userId: string, email: string) => {
    setIsRevokingAllForUserId(userId);
    try {
      const revokedCount = await revokeAllUserSessions({
        userId,
        reason: "Revoked by admin",
      });
      toast.success(`Revoked ${revokedCount} session${revokedCount === 1 ? "" : "s"}.`);
      await reloadAdminData({ silent: true });
    } catch {
      toast.error("Could not revoke user sessions.");
    } finally {
      setIsRevokingAllForUserId(null);
    }
  };

  const openRevokeSessionModal = (sessionRecord: UserSessionRecord) => {
    setRevokeAccessTarget({ kind: "session", sessionRecord });
  };

  const openRevokeAllSessionsModal = (userId: string, email: string, activeSessionCount: number) => {
    setRevokeAccessTarget({ kind: "user", userId, email, activeSessionCount });
  };

  const confirmRevokeAccess = async () => {
    if (!revokeAccessTarget) return;

    const target = revokeAccessTarget;
    setRevokeAccessTarget(null);

    if (target.kind === "session") {
      await handleRevokeSession(target.sessionRecord);
      return;
    }

    await handleRevokeAllSessionsForUser(target.userId, target.email);
  };

  useEffect(() => {
    void reloadAdminData();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      // Avoid overwriting unsaved tracking/status edits while on Orders.
      if (isOrdersSection) return;
      void reloadAdminData({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isOrdersSection]);

  const displayName = useMemo(() => {
    const first = user?.user_metadata?.first_name as string | undefined;
    const last = user?.user_metadata?.last_name as string | undefined;
    const full = [first, last].filter(Boolean).join(" ").trim();
    return full || user?.email || "Admin";
  }, [user]);

  const editingProduct = useMemo(() => {
    if (!isProductEditSection || !productHandle || productHandle === "new") return null;
    return products.find((product) => product.handle === productHandle) ?? null;
  }, [isProductEditSection, productHandle, products]);

  const customerNameByEmail = useMemo(() => {
    return new Map(
      customerProfiles.map((profile) => {
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
        return [profile.email, fullName || profile.email];
      }),
    );
  }, [customerProfiles]);

  const sessionsByUserId = useMemo(() => {
    return userSessions.reduce<Record<string, UserSessionRecord[]>>((accumulator, sessionRecord) => {
      accumulator[sessionRecord.user_id] ||= [];
      accumulator[sessionRecord.user_id].push(sessionRecord);
      return accumulator;
    }, {});
  }, [userSessions]);

  const usersPerPage = 4;
  const totalUsersPages = Math.max(1, Math.ceil(customerProfiles.length / usersPerPage));
  const paginatedCustomerProfiles = useMemo(() => {
    const start = (usersPage - 1) * usersPerPage;
    return customerProfiles.slice(start, start + usersPerPage);
  }, [customerProfiles, usersPage]);

  useEffect(() => {
    setUsersPage(1);
  }, [customerProfiles.length]);


  const orderItemsByOrderId = useMemo(() => {
    return orderItems.reduce<Record<string, OrderItemRecord[]>>((accumulator, item) => {
      accumulator[item.order_id] ||= [];
      accumulator[item.order_id].push(item);
      return accumulator;
    }, {});
  }, [orderItems]);

  const insights = useMemo(() => {
    const now = Date.now();
    const msInDay = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * msInDay;
    const thirtyDaysAgo = now - 30 * msInDay;

    const customersWithRecentSignIn = customerProfiles.filter((profile) => {
      if (!profile.last_sign_in_at) return false;
      const signedInAt = new Date(profile.last_sign_in_at).getTime();
      return Number.isFinite(signedInAt) && signedInAt >= thirtyDaysAgo;
    }).length;

    const ordersLast7Days = orders.filter((order) => {
      const createdAt = new Date(order.created_at).getTime();
      return Number.isFinite(createdAt) && createdAt >= sevenDaysAgo;
    });

    const revenueLast7Days = ordersLast7Days.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const averageOrderValue = ordersLast7Days.length > 0 ? revenueLast7Days / ordersLast7Days.length : 0;

    const productCounts = orderItems.reduce<Record<string, { title: string; qty: number }>>((acc, item) => {
      const key = item.product_handle;
      if (!acc[key]) {
        acc[key] = { title: item.product_title, qty: 0 };
      }
      acc[key].qty += item.quantity;
      return acc;
    }, {});

    const topProduct = Object.values(productCounts).sort((a, b) => b.qty - a.qty)[0] ?? null;

    const cancelledOrders = orders.filter((order) => order.status === "cancelled").length;
    const fulfilledWithoutTracking = orders.filter(
      (order) => order.status === "fulfilled" && !(order.tracking_number ?? "").trim(),
    ).length;

    return {
      totalCustomers: customerProfiles.length,
      customersWithRecentSignIn,
      ordersLast7Days: ordersLast7Days.length,
      revenueLast7Days,
      averageOrderValue,
      topProduct,
      cancelledOrders,
      fulfilledWithoutTracking,
    };
  }, [customerProfiles, orderItems, orders]);

  const productsPerPage = 10;
  const totalProductPages = Math.max(1, Math.ceil(products.length / productsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (productsPage - 1) * productsPerPage;
    return products.slice(start, start + productsPerPage);
  }, [products, productsPage]);

  const filteredOrders = useMemo(() => {
    const query = orderSearchQuery.trim().toLowerCase();
    if (!query) return orders;

    return orders.filter((order) => {
      const customerName = customerNameByEmail.get(order.customer_email ?? "") ?? "";
      const products = orderItemsByOrderId[order.id] ?? [];

      const haystack = [
        customerName,
        order.customer_email ?? "",
        order.external_id ?? "",
        order.tracking_number ?? "",
        order.status,
        ...products.flatMap((item) => [item.product_title, item.product_handle]),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [orders, orderSearchQuery, customerNameByEmail, orderItemsByOrderId]);

  const sortedOrders = useMemo(() => {
    const nextOrders = [...filteredOrders];

    if (orderSort === "oldest") {
      nextOrders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return nextOrders;
    }

    if (orderSort === "amount_desc") {
      nextOrders.sort((a, b) => Number(b.total_amount) - Number(a.total_amount));
      return nextOrders;
    }

    if (orderSort === "amount_asc") {
      nextOrders.sort((a, b) => Number(a.total_amount) - Number(b.total_amount));
      return nextOrders;
    }

    if (orderSort === "status") {
      nextOrders.sort((a, b) => {
        const statusCompare = a.status.localeCompare(b.status);
        if (statusCompare !== 0) return statusCompare;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return nextOrders;
    }

    nextOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return nextOrders;
  }, [filteredOrders, orderSort]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPerPage;
    return sortedOrders.slice(start, start + ordersPerPage);
  }, [sortedOrders, ordersPage, ordersPerPage]);

  const getOrderCardAccentClass = (status: string) => {
    if (status === "fulfilled") return "border-l-emerald-500";
    if (status === "processing") return "border-l-sky-500";
    if (status === "cancelled") return "border-l-rose-500";
    return "border-l-amber-500";
  };

  const getOrderStatusPillClass = (status: string) => {
    if (status === "fulfilled") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "processing") return "bg-sky-100 text-sky-800 border-sky-200";
    if (status === "cancelled") return "bg-rose-100 text-rose-800 border-rose-200";
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

  const getOrderStatusSelectClass = (status: string) => {
    if (status === "fulfilled") return "border-emerald-300 bg-emerald-50 text-emerald-900";
    if (status === "processing") return "border-sky-300 bg-sky-50 text-sky-900";
    if (status === "cancelled") return "border-rose-300 bg-rose-50 text-rose-900";
    return "border-amber-300 bg-amber-50 text-amber-900";
  };

  useEffect(() => {
    setProductsPage((current) => {
      if (current > totalProductPages) return totalProductPages;
      if (current < 1) return 1;
      return current;
    });
  }, [totalProductPages]);

  useEffect(() => {
    setOrdersPage((current) => {
      if (current > totalOrderPages) return totalOrderPages;
      if (current < 1) return 1;
      return current;
    });
  }, [totalOrderPages]);

  useEffect(() => {
    if (isProductsSection) {
      setProductsPage(1);
    }
  }, [isProductsSection]);

  useEffect(() => {
    if (isOrdersSection) {
      setOrdersPage(1);
    }
  }, [isOrdersSection]);

  useEffect(() => {
    setOrdersPage(1);
  }, [orderSearchQuery]);

  const handleSignOut = async () => {
    if (!supabase) return;

    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Could not sign out right now. Please try again.");
      setIsSigningOut(false);
      return;
    }

    toast.success("Signed out successfully.");
    window.location.assign("/login");
  };

  const handleSaveProduct = async (product: AdminInventoryProduct) => {
    const handle = product.handle.trim().toLowerCase();
    const title = product.title.trim();
    const description = product.description.trim();
    const variantId = (product.variant_id ?? "").trim();
    const capColor = (product.cap_color ?? "").trim();
    const images = parseImagesInput(JSON.stringify(product.images));

    const parsedPrice = Number.parseFloat(String(product.price));
    const upc = (product.upc ?? "").trim();
    if (!/^[a-z0-9-]+$/.test(handle)) {
      toast.error("Handle must contain lowercase letters, numbers, or hyphens.");
      return;
    }
    if (title.length < 2) {
      toast.error("Title must be at least 2 characters.");
      return;
    }
    if (description.length < 2) {
      toast.error("Description must be at least 2 characters.");
      return;
    }
    if (!variantId) {
      toast.error("Variant ID is required.");
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(capColor)) {
      toast.error("Cap color must be a valid hex code like #f5f5f5.");
      return;
    }
    if (!images) {
      toast.error("Images must be valid JSON array with url and altText.");
      return;
    }

    const fillColor = (product.fill_color ?? "").trim();
    const model3dUrl = (product.model_3d_url ?? "").trim();
    if (fillColor && !/^#[0-9a-fA-F]{6}$/.test(fillColor)) {
      toast.error("Fill color must be blank or a hex code like #7a86b8.");
      return;
    }
    if (model3dUrl && !/^https?:\/\//i.test(model3dUrl)) {
      toast.error("3D model URL must be a valid http(s) URL.");
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a valid non-negative number.");
      return;
    }

    setIsSavingProduct(product.id);
    try {
      await updateInventoryProduct({
        id: product.id,
        handle,
        title,
        description,
        fullDescription: product.full_description,
        price: parsedPrice,
        availableForSale: product.available_for_sale,
        currencyCode: product.currency_code,
        images,
        variantId,
        capColor,
        fillColor: fillColor || null,
        model3dUrl: model3dUrl || null,
        enable3dViewer: product.enable_3d_viewer,
        upc: upc || null,
      } as any);
      toast.success("Product updated.");
      await reloadAdminData();
    } catch {
      toast.error("Could not update product.");
    } finally {
      setIsSavingProduct(null);
    }
  };

  const performDeleteProduct = async (product: AdminInventoryProduct) => {
    setIsDeletingProduct(product.id);
    try {
      await deleteInventoryProduct(product.id);
      toast.success("Product deleted.");
      await reloadAdminData();
    } catch {
      toast.error("Could not delete product.");
    } finally {
      setIsDeletingProduct(null);
    }
  };

  const openProductDeleteModal = (product: AdminInventoryProduct) => {
    setProductDeleteTarget({ product });
  };

  const confirmDeleteProduct = async () => {
    if (!productDeleteTarget) return;

    const target = productDeleteTarget;
    setProductDeleteTarget(null);
    await performDeleteProduct(target.product);
  };

  const handleUploadNewProductImage = async (file: File | null) => {
    if (!file) return;

    const handle = newProduct.handle.trim().toLowerCase();
    if (!handle) {
      toast.error("Enter a product handle before uploading files.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    setIsUploadingImageFor("new");
    try {
      const webpFile = await convertImageFileToWebp(file);
      const url = await uploadProductAsset({ productHandle: handle, file: webpFile, kind: "image" });
      const existingImages = parseImagesInput(newProduct.imagesJson) ?? [];
      const altText = `${newProduct.title || handle} image`;
      const nextImages = [...existingImages, { url, altText }];
      setNewProduct((prev) => ({ ...prev, imagesJson: JSON.stringify(nextImages, null, 2) }));
      toast.success("Image uploaded and added to product images.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setIsUploadingImageFor(null);
    }
  };

  const handleUploadNewProductModel = async (file: File | null) => {
    if (!file) return;

    const handle = newProduct.handle.trim().toLowerCase();
    if (!handle) {
      toast.error("Enter a product handle before uploading files.");
      return;
    }

    const isGlb = /\.glb$/i.test(file.name) || file.type === "model/gltf-binary";
    if (!isGlb) {
      toast.error("Please choose a .glb file.");
      return;
    }

    setIsUploadingModelFor("new");
    try {
      const url = await uploadProductAsset({ productHandle: handle, file, kind: "model" });
      setNewProduct((prev) => ({ ...prev, model3dUrl: url }));
      toast.success("3D model uploaded.");
    } catch {
      toast.error("Could not upload 3D model.");
    } finally {
      setIsUploadingModelFor(null);
    }
  };

  const handleUploadProductImage = async (product: AdminInventoryProduct, file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    setIsUploadingImageFor(product.id);
    try {
      const webpFile = await convertImageFileToWebp(file);
      const url = await uploadProductAsset({ productHandle: product.handle, file: webpFile, kind: "image" });
      const existingImages = parseImagesInput(JSON.stringify(product.images)) ?? [];
      const next = { ...product, images: [...existingImages, { url, altText: `${product.title} image` }] };
      setProducts((prev) => prev.map((p) => (p.id === product.id ? next : p)));
      await handleSaveProduct(next);
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setIsUploadingImageFor(null);
    }
  };

  const handleUploadProductModel = async (product: AdminInventoryProduct, file: File | null) => {
    if (!file) return;

    const isGlb = /\.glb$/i.test(file.name) || file.type === "model/gltf-binary";
    if (!isGlb) {
      toast.error("Please choose a .glb file.");
      return;
    }

    setIsUploadingModelFor(product.id);
    try {
      const url = await uploadProductAsset({ productHandle: product.handle, file, kind: "model" });
      const next = { ...product, model_3d_url: url };
      setProducts((prev) => prev.map((p) => (p.id === product.id ? next : p)));
      await handleSaveProduct(next);
      toast.success("3D model uploaded.");
    } catch {
      toast.error("Could not upload 3D model.");
    } finally {
      setIsUploadingModelFor(null);
    }
  };

  const handleMoveProductImage = (product: AdminInventoryProduct, fromIndex: number, toIndex: number) => {
    const images = parseImagesInput(JSON.stringify(product.images)) ?? [];
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= images.length || toIndex >= images.length) return;

    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, images: reordered } : p)),
    );
  };

  const handleSetProductImageFirst = (product: AdminInventoryProduct, index: number) => {
    handleMoveProductImage(product, index, 0);
  };

  const handleRemoveProductImage = (product: AdminInventoryProduct, index: number) => {
    const images = parseImagesInput(JSON.stringify(product.images)) ?? [];
    if (index < 0 || index >= images.length) return;

    const nextImages = images.filter((_, currentIndex) => currentIndex !== index);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, images: nextImages } : p)),
    );
  };

  const openRemoveImageModal = (product: AdminInventoryProduct, index: number) => {
    const images = parseImagesInput(JSON.stringify(product.images)) ?? [];
    const image = images[index];
    if (!image) return;
    setRemoveImageTarget({ product, index, url: image.url });
  };

  const confirmRemoveImage = () => {
    if (!removeImageTarget) return;

    const target = removeImageTarget;
    setRemoveImageTarget(null);
    handleRemoveProductImage(target.product, target.index);
  };

  const handleAddProduct = async () => {
    const handleRaw = newProduct.handle.trim().toLowerCase();
    const handle = newProduct.category === "apparel" && !handleRaw.startsWith("father-figure-")
      ? `father-figure-${handleRaw}`
      : handleRaw;
    const title = newProduct.title.trim();
    const description = newProduct.description.trim();
    const fullDescription = newProduct.fullDescription.trim();
    const images = parseImagesInput(newProduct.imagesJson);
    const variantId = newProduct.variantId.trim();
    const capColor = newProduct.capColor.trim();
    const fillColor = newProduct.fillColor.trim();
    const model3dUrl = newProduct.model3dUrl.trim();
    const upc = newProduct.upc.trim();
    const parsedPrice = Number.parseFloat(newProduct.price);

    if (!/^[a-z0-9-]+$/.test(handle)) {
      toast.error("Handle must contain lowercase letters, numbers, or hyphens.");
      return;
    }
    if (title.length < 2) {
      toast.error("Title must be at least 2 characters.");
      return;
    }
    if (description.length < 2) {
      toast.error("Description must be at least 2 characters.");
      return;
    }
    if (!variantId) {
      toast.error("Variant ID is required.");
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(capColor)) {
      toast.error("Cap color must be a valid hex code like #f5f5f5.");
      return;
    }
    if (fillColor && !/^#[0-9a-fA-F]{6}$/.test(fillColor)) {
      toast.error("Fill color must be blank or a hex code like #7a86b8.");
      return;
    }
    if (!images) {
      toast.error("Images must be valid JSON array with url and altText.");
      return;
    }
    if (model3dUrl && !/^https?:\/\//i.test(model3dUrl)) {
      toast.error("3D model URL must be a valid http(s) URL.");
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a valid non-negative number.");
      return;
    }

    setIsAddingProduct(true);
    try {
      await createInventoryProduct({
        handle,
        title,
        description,
        fullDescription: fullDescription || null,
        price: parsedPrice,
        currencyCode: newProduct.currencyCode.trim().toUpperCase() || "USD",
        availableForSale: newProduct.availableForSale,
        images,
        variantId,
        capColor,
        fillColor: fillColor || null,
        model3dUrl: model3dUrl || null,
        enable3dViewer: newProduct.enable3dViewer,
        upc: upc || null,
      } as any);
      toast.success("Product added.");
      setNewProduct({
        category: "supplement",
        handle: "",
        title: "",
        description: "",
        fullDescription: "",
        price: "0.00",
        currencyCode: "USD",
        availableForSale: true,
        imagesJson: "[]",
        variantId: "",
        capColor: "#f5f5f5",
        fillColor: "",
        model3dUrl: "",
        enable3dViewer: false,
        upc: "",
      });
      await reloadAdminData();
    } catch {
      toast.error("Could not add product. Handle may already exist.");
    } finally {
      setIsAddingProduct(false);
    }
  };

  const persistSortOrder = async (orderedProducts: AdminInventoryProduct[]) => {
    setIsSavingSortOrder(true);
    try {
      await updateInventoryProductSortOrders(
        orderedProducts.map((product, index) => ({ id: product.id, sortOrder: index })),
      );
      toast.success("Product order saved.");
    } catch {
      toast.error("Could not save product order.");
      await reloadAdminData();
    } finally {
      setIsSavingSortOrder(false);
    }
  };

  const handleDragStart = (productId: string) => {
    setDraggingProductId(productId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDropOnProduct = async (targetId: string) => {
    if (!draggingProductId || draggingProductId === targetId) {
      setDraggingProductId(null);
      return;
    }

    const fromIndex = products.findIndex((product) => product.id === draggingProductId);
    const toIndex = products.findIndex((product) => product.id === targetId);

    if (fromIndex < 0 || toIndex < 0) {
      setDraggingProductId(null);
      return;
    }

    const reordered = [...products];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setProducts(reordered);
    setDraggingProductId(null);
    await persistSortOrder(reordered);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 py-12 bg-gradient-to-b from-sky/20 via-secondary to-background">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy/70 hover:text-orange transition-colors font-medium">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            {user && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5">
                  <Link to="/dashboard">Customer Dashboard</Link>
                </Button>
                <Button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  variant="outline"
                  className="border-navy/20 text-navy hover:bg-navy/5"
                >
                  <LogOut className="h-4 w-4 mr-2" /> {isSigningOut ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            )}
          </div>

          <Card className="border-navy/15 shadow-card mb-6 bg-white/95">
            <CardHeader>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-navy/10 border-navy/20 text-navy text-sm uppercase tracking-widest font-semibold mb-3 w-fit">
                <ShieldCheck className="h-3.5 w-3.5" /> Admin Dashboard
              </div>
              <CardTitle className="font-display uppercase text-xl text-navy">Welcome, {displayName}</CardTitle>
              <CardDescription>
                Manage customer operations and monitor storefront activity from one control surface.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-navy/15 shadow-card bg-white/95 mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-navy">Admin Menu</CardTitle>
              <CardDescription>Each area now has its own page.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 duration-300">
                <Link to="/admin/metrics">Metrics</Link>
              </Button>
              <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 duration-300">
                <Link to="/admin/products">Products</Link>
              </Button>
              <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 duration-300">
                <Link to="/admin/orders">Orders</Link>
              </Button>
              <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 duration-300">
                <Link to="/admin/users">Users</Link>
              </Button>
              <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 duration-300">
                <Link to="/admin/bundles">Bundles</Link>
              </Button>
              <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5 duration-300">
                <Link to="/admin/insights">Insights</Link>
              </Button>
            </CardContent>
          </Card>

          {isOverview && (
            <Card className="border-navy/15 bg-white/95 mb-6">
              <CardHeader>
                <CardTitle className="text-lg text-navy">Choose an Admin Page</CardTitle>
                <CardDescription>
                  Select a menu button to manage one area at a time: metrics, products, orders, users, bundles, or insights.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {isMetricsSection && (
            <div className="grid md:grid-cols-3 gap-5 mb-6">
              <Card className="border-navy/15 bg-white/95">
                <CardHeader>
                  <CardTitle className="text-lg text-navy">Sales</CardTitle>
                  <CardDescription>Total processed revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-3xl text-orange">
                    {metrics.currencyCode} {metrics.totalSales.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-navy/15 bg-white/95">
                <CardHeader>
                  <CardTitle className="text-lg text-navy">Total Orders</CardTitle>
                  <CardDescription>Completed checkout records</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-3xl text-orange">{metrics.totalOrders}</p>
                </CardContent>
              </Card>

              <Card className="border-navy/15 bg-white/95">
                <CardHeader>
                  <CardTitle className="text-lg text-navy">Active Users</CardTitle>
                  <CardDescription>Unique customers with completed orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-3xl text-orange">{metrics.activeUsers}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {isProductsSection && (
            <Card className="border-navy/15 bg-white/95 mb-6">
              <CardHeader>
                <CardTitle className="text-lg text-navy">Products List</CardTitle>
                <CardDescription>
                  View all products on one page, then open a separate page to edit a specific product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingData ? (
                  <p className="text-sm text-navy/60">Loading products...</p>
                ) : products.length === 0 ? (
                  <p className="text-sm text-navy/60">No products found in inventory_products.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm uppercase tracking-wide text-navy/60">
                      Drag products by the grip icon to reorder. {isSavingSortOrder ? "Saving order..." : ""}
                    </p>
                    {paginatedProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className={`border rounded-lg p-4 bg-white/80 transition-colors ${draggingProductId === product.id ? "border-orange/60 bg-orange/5" : "border-navy/10"}`}
                        onDragOver={handleDragOver}
                        onDrop={() => void handleDropOnProduct(product.id)}
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              draggable
                              onDragStart={() => handleDragStart(product.id)}
                              onDragEnd={() => setDraggingProductId(null)}
                              className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-navy/20 text-navy/60 hover:text-navy hover:border-navy/40 cursor-grab active:cursor-grabbing"
                              title="Drag to reorder"
                              aria-label="Drag to reorder"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                            <div>
                              <p className="font-semibold text-navy">{product.title || "Untitled Product"}</p>
                              <p className="text-sm text-navy/60">Category: <span className="font-medium">{product.handle.startsWith("father-figure-") ? "Apparel" : "Supplement"}</span></p>
                              <p className="text-sm text-navy/60">Handle: {product.handle}</p>
                              <p className="text-sm text-navy/60">Position: {(productsPage - 1) * productsPerPage + index + 1}</p>
                              <p className="text-sm text-navy/60">{product.currency_code} {Number(product.price).toFixed(2)}</p>
                              <p className="text-sm text-navy/70 mt-1">{product.description || "No short description."}</p>
                              {product.upc && <p className="text-xs font-mono text-navy/60 mt-1">UPC: {product.upc}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5">
                              <Link to={`/admin/product-edit/${product.handle}`}>Edit Product</Link>
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => openProductDeleteModal(product)}
                              disabled={isDeletingProduct === product.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isDeletingProduct === product.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${product.available_for_sale ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                            }`}>
                            {product.available_for_sale ? "Available" : "Unavailable"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {totalProductPages > 1 && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <p className="text-sm text-navy/60">
                          Page {productsPage} of {totalProductPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="border-navy/20 text-navy hover:bg-navy/5"
                            disabled={productsPage === 1}
                            onClick={() => setProductsPage((prev) => Math.max(1, prev - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            className="border-navy/20 text-navy hover:bg-navy/5"
                            disabled={productsPage >= totalProductPages}
                            onClick={() => setProductsPage((prev) => Math.min(totalProductPages, prev + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Button asChild className="bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider">
                    <Link to="/admin/product-edit/new">Add New Product</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isProductEditSection && (
            <Card className="border-navy/15 bg-white/95 mb-6 shadow-card">
              <CardHeader>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold w-fit">
                  Product Editor
                </div>
                <CardTitle className="text-lg text-navy">Product Edit Studio</CardTitle>
                <CardDescription>
                  Tune product copy and preview how content will read before it goes live.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button asChild variant="outline" className="border-navy/20 text-navy hover:bg-navy/5">
                  <Link to="/admin/products">Back to Products List</Link>
                </Button>

                {isEditingNewProduct ? (
                  <>
                    <div className="rounded-lg border border-navy/10 bg-secondary/20 p-3 space-y-3">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Add New Product: Core Info</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Category</p>
                          <select
                            value={newProduct.category}
                            onChange={(e) => setNewProduct((prev) => ({ ...prev, category: e.target.value }))}
                            className="h-10 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-navy"
                          >
                            <option value="supplement">Supplement</option>
                            <option value="apparel">Apparel</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Handle</p>
                          <Input
                            placeholder="creatine-hardbody"
                            value={newProduct.handle}
                            onChange={(e) => setNewProduct((prev) => ({ ...prev, handle: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Title</p>
                          <Input
                            placeholder="Product title"
                            value={newProduct.title}
                            onChange={(e) => setNewProduct((prev) => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Variant ID</p>
                          <Input
                            placeholder="var-product-default"
                            value={newProduct.variantId}
                            onChange={(e) => setNewProduct((prev) => ({ ...prev, variantId: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Price</p>
                          <Input
                            placeholder="0.00"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Currency</p>
                          <Input
                            placeholder="USD"
                            value={newProduct.currencyCode}
                            onChange={(e) => setNewProduct((prev) => ({ ...prev, currencyCode: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-navy/10 bg-secondary/20 p-3 space-y-3">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Add New Product: Descriptions</p>
                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-navy/10 bg-white/90 p-3 space-y-3">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Description Editor</p>
                          <div className="space-y-1">
                            <p className="text-sm uppercase tracking-wide text-navy/60">Short Description</p>
                            <Input
                              placeholder="Short summary shown under product title"
                              value={newProduct.description}
                              onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm uppercase tracking-wide text-navy/60">Full Description</p>
                            <RichTextEditor
                              value={newProduct.fullDescription}
                              onChange={(nextValue) => setNewProduct((prev) => ({ ...prev, fullDescription: nextValue }))}
                              placeholder="Full product description with formatting"
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border border-navy/10 bg-sky/10 p-3">
                          <p className="text-sm uppercase tracking-wide text-navy/60 mb-2">Live Preview</p>
                          <p className="text-sm text-navy/80 mb-3">{newProduct.description || "No short description yet."}</p>
                          <div
                            className="text-sm text-navy/80 [&_b]:font-semibold [&_i]:italic [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
                            dangerouslySetInnerHTML={{ __html: newProduct.fullDescription || "<p>No full description yet.</p>" }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-navy/10 bg-secondary/20 p-3 space-y-3">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Add New Product: Visuals</p>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Cap Color</p>
                          <HexColorInput
                            placeholder="#f5f5f5"
                            value={newProduct.capColor}
                            onChange={(capColor) => setNewProduct((prev) => ({ ...prev, capColor }))}
                            fallbackColor="#f5f5f5"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Fill Color</p>
                          <HexColorInput
                            placeholder="#7a86b8 or blank"
                            value={newProduct.fillColor}
                            onChange={(fillColor) => setNewProduct((prev) => ({ ...prev, fillColor }))}
                            fallbackColor="#7a86b8"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">3D Model URL (.glb)</p>
                          <Input
                            placeholder="https://.../model.glb"
                            value={newProduct.model3dUrl}
                            onChange={(e) => setNewProduct((prev) => ({ ...prev, model3dUrl: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              void handleUploadNewProductImage(e.target.files?.[0] ?? null);
                              e.currentTarget.value = "";
                            }}
                          />
                          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            {isUploadingImageFor === "new" ? "Converting & uploading..." : "Upload Image (auto .webp)"}
                          </span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="file"
                            accept=".glb,model/gltf-binary"
                            className="hidden"
                            onChange={(e) => {
                              void handleUploadNewProductModel(e.target.files?.[0] ?? null);
                              e.currentTarget.value = "";
                            }}
                          />
                          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            {isUploadingModelFor === "new" ? "Uploading .glb..." : "Upload 360 .glb"}
                          </span>
                        </label>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm uppercase tracking-wide text-navy/60">Images JSON</p>
                        <Textarea
                          placeholder='[{"url":"...","altText":"..."}]'
                          value={newProduct.imagesJson}
                          onChange={(e) => setNewProduct((prev) => ({ ...prev, imagesJson: e.target.value }))}
                          className="min-h-24"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <label className="inline-flex items-center gap-2 text-sm text-navy/70">
                        <input
                          type="checkbox"
                          checked={newProduct.availableForSale}
                          onChange={(e) => setNewProduct((prev) => ({ ...prev, availableForSale: e.target.checked }))}
                        />
                        Available for sale
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-navy/70">
                        <input
                          type="checkbox"
                          checked={newProduct.enable3dViewer}
                          onChange={(e) => setNewProduct((prev) => ({ ...prev, enable3dViewer: e.target.checked }))}
                        />
                        Enable 3D Viewer
                      </label>
                      <Button onClick={handleAddProduct} disabled={isAddingProduct} className="w-full md:w-auto">
                        {isAddingProduct ? "Adding..." : "Add Product"}
                      </Button>
                    </div>
                  </>
                ) : !productHandle ? (
                  <p className="text-sm text-navy/60">No product selected. Pick one from Products List.</p>
                ) : isLoadingData ? (
                  <p className="text-sm text-navy/60">Loading product...</p>
                ) : !editingProduct ? (
                  <p className="text-sm text-navy/60">Product not found for handle: {productHandle}</p>
                ) : (
                  <>
                    <p className="text-sm uppercase tracking-wide text-navy/60">Product: {editingProduct.title || editingProduct.handle}</p>
                    <div className="rounded-lg border border-navy/10 bg-secondary/20 p-3 space-y-3">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Core Info</p>
                      <div className="grid md:grid-cols-6 gap-3">
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Category</p>
                          <Input
                            value={editingProduct.handle.startsWith("father-figure-") ? "Apparel" : "Supplement"}
                            disabled
                            className="bg-secondary/40"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Handle</p>
                          <Input
                            value={editingProduct.handle}
                            onChange={(e) => {
                              const handle = e.target.value;
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, handle } : p)));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Title</p>
                          <Input
                            value={editingProduct.title}
                            onChange={(e) => {
                              const title = e.target.value;
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, title } : p)));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Variant ID</p>
                          <Input
                            value={editingProduct.variant_id ?? ""}
                            onChange={(e) => {
                              const variant_id = e.target.value;
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, variant_id } : p)));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Price</p>
                          <Input
                            value={String(editingProduct.price)}
                            onChange={(e) => {
                              const price = Number.parseFloat(e.target.value || "0");
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, price: Number.isNaN(price) ? 0 : price } : p)));
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Currency</p>
                          <Input
                            value={editingProduct.currency_code}
                            onChange={(e) => {
                              const currency_code = e.target.value.toUpperCase();
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, currency_code } : p)));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-navy/10 bg-secondary/20 p-3 space-y-3">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Descriptions</p>
                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-navy/10 bg-white/90 p-3 space-y-3">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Description Editor</p>
                          <div className="space-y-1">
                            <p className="text-sm uppercase tracking-wide text-navy/60">Short Description</p>
                            <Input
                              placeholder="Short description shown under product title"
                              value={editingProduct.description}
                              onChange={(e) => {
                                const description = e.target.value;
                                setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, description } : p)));
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm uppercase tracking-wide text-navy/60">Full Description</p>
                            <RichTextEditor
                              value={editingProduct.full_description ?? ""}
                              onChange={(e) => {
                                const full_description = e;
                                setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, full_description } : p)));
                              }}
                              placeholder="Full product description with formatting"
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border border-navy/10 bg-sky/10 p-3">
                          <p className="text-sm uppercase tracking-wide text-navy/60 mb-2">Description Preview</p>
                          <p className="text-sm text-navy/80 mb-3">{editingProduct.description || "No short description."}</p>
                          <div
                            className="text-sm text-navy/80 [&_b]:font-semibold [&_i]:italic [&_ul]:list-disc [&_ul]:ml-5 [&_li]:mb-1"
                            dangerouslySetInnerHTML={{ __html: editingProduct.full_description || "" }}
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">UPC</p>
                          <Input
                            placeholder="e.g. 199874431949"
                            value={editingProduct.upc ?? ""}
                            onChange={(e) => {
                              const upc = e.target.value;
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, upc } : p)));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-navy/10 bg-secondary/20 p-3 space-y-3">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Media and Visuals</p>
                      <div className="space-y-2">
                        <p className="text-sm uppercase tracking-wide text-navy/60">Image Order</p>
                        <p className="text-sm text-navy/60">The first image is used in Product Grid and as the default image in Product Detail.</p>
                        {(parseImagesInput(JSON.stringify(editingProduct.images)) ?? []).length === 0 ? (
                          <p className="text-sm text-navy/60">No images yet. Upload one below.</p>
                        ) : (
                          <div className="space-y-2">
                            {(parseImagesInput(JSON.stringify(editingProduct.images)) ?? []).map((image, index, allImages) => (
                              <div key={`${image.url}-${index}`} className="rounded-md border border-navy/10 bg-secondary/20 p-2.5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={image.url}
                                    alt={image.altText}
                                    className="h-14 w-14 rounded-md border border-navy/10 object-cover bg-white"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-navy">Image {index + 1}{index === 0 ? " (Primary)" : ""}</p>
                                    <p className="text-sm text-navy/70 truncate">{image.altText}</p>
                                    <p className="text-sm text-navy/50 truncate">{image.url}</p>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-navy/20 text-navy hover:bg-navy/5"
                                    disabled={index === 0}
                                    onClick={() => handleMoveProductImage(editingProduct, index, index - 1)}
                                  >
                                    Move Up
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-navy/20 text-navy hover:bg-navy/5"
                                    disabled={index === allImages.length - 1}
                                    onClick={() => handleMoveProductImage(editingProduct, index, index + 1)}
                                  >
                                    Move Down
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-navy/20 text-navy hover:bg-navy/5"
                                    disabled={index === 0}
                                    onClick={() => handleSetProductImageFirst(editingProduct, index)}
                                  >
                                    Set First
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => openRemoveImageModal(editingProduct, index)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm uppercase tracking-wide text-navy/60">Images JSON</p>
                        <Textarea
                          value={JSON.stringify(editingProduct.images, null, 2)}
                          onChange={(e) => {
                            const parsed = parseImagesInput(e.target.value);
                            if (!parsed) return;
                            setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, images: parsed } : p)));
                          }}
                          className="min-h-24 font-mono text-sm"
                        />
                      </div>
                      <div className="grid md:grid-cols-5 gap-3 items-end">
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Cap Color</p>
                          <HexColorInput
                            placeholder="#f5f5f5"
                            value={editingProduct.cap_color ?? ""}
                            onChange={(cap_color) => {
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, cap_color } : p)));
                            }}
                            fallbackColor="#f5f5f5"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm uppercase tracking-wide text-navy/60">Fill Color</p>
                          <HexColorInput
                            placeholder="#7a86b8 or blank"
                            value={editingProduct.fill_color ?? ""}
                            onChange={(fill_color) => {
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, fill_color } : p)));
                            }}
                            fallbackColor="#7a86b8"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <p className="text-sm uppercase tracking-wide text-navy/60">3D Model URL</p>
                          <Input
                            value={editingProduct.model_3d_url ?? ""}
                            onChange={(e) => {
                              const model_3d_url = e.target.value;
                              setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, model_3d_url } : p)));
                            }}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="inline-flex items-center gap-2 text-sm text-navy/70">
                            <input
                              type="checkbox"
                              checked={editingProduct.available_for_sale}
                              onChange={(e) => {
                                const available_for_sale = e.target.checked;
                                setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, available_for_sale } : p)));
                              }}
                            />
                            Available for sale
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-navy/70">
                            <input
                              type="checkbox"
                              checked={editingProduct.enable_3d_viewer ?? false}
                              onChange={(e) => {
                                const enable_3d_viewer = e.target.checked;
                                setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, enable_3d_viewer } : p)));
                              }}
                            />
                            Enable 3D Viewer
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              void handleUploadProductImage(editingProduct, e.target.files?.[0] ?? null);
                              e.currentTarget.value = "";
                            }}
                          />
                          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            {isUploadingImageFor === editingProduct.id ? "Converting & uploading..." : "Upload Image (auto .webp)"}
                          </span>
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="file"
                            accept=".glb,model/gltf-binary"
                            className="hidden"
                            onChange={(e) => {
                              void handleUploadProductModel(editingProduct, e.target.files?.[0] ?? null);
                              e.currentTarget.value = "";
                            }}
                          />
                          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
                            {isUploadingModelFor === editingProduct.id ? "Uploading .glb..." : "Upload 360 .glb"}
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => void handleSaveProduct(editingProduct)}
                        disabled={isSavingProduct === editingProduct.id}
                      >
                        {isSavingProduct === editingProduct.id ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => openProductDeleteModal(editingProduct)}
                        disabled={isDeletingProduct === editingProduct.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeletingProduct === editingProduct.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {isOrdersSection && (
            <Card className="border-navy/15 bg-white/95 mb-6">
              {/* Order Tracking Section */}
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg text-navy">Order Tracking</CardTitle>
                    <CardDescription>
                      View orders, mark fulfillment, and update statuses.
                    </CardDescription>
                  </div>
                  <div className="flex items-center justify-end gap-3 flex-wrap">
                    <label className="flex items-center gap-2 text-sm text-navy/70">
                      <span className="uppercase tracking-wide text-navy/60">Per Page</span>
                      <select
                        value={ordersPerPage}
                        onChange={(e) => {
                          setOrdersPerPage(Number(e.target.value));
                          setOrdersPage(1);
                        }}
                        className="h-10 rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-navy"
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-navy/70">
                      <Input
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder="Customer, email, order ID, tracking, product..."
                        className="h-10 w-64 max-w-full border-navy/20 bg-white text-sm text-navy"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-navy/70">
                      <select
                        value={orderSort}
                        onChange={(e) => {
                          const nextSort = e.target.value as "newest" | "oldest" | "amount_desc" | "amount_asc" | "status";
                          setOrderSort(nextSort);
                          setOrdersPage(1);
                        }}
                        className="h-10 rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-navy"
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="amount_desc">Amount high to low</option>
                        <option value="amount_asc">Amount low to high</option>
                        <option value="status">Status (A-Z)</option>
                      </select>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <p className="text-sm text-navy/60">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-navy/60">No orders found yet.</p>
                ) : filteredOrders.length === 0 ? (
                  <p className="text-sm text-navy/60">No orders match your search.</p>
                ) : (
                  <div className="space-y-3">
                    {paginatedOrders.map((order, index) => (
                      <div
                        key={order.id}
                        className={`border border-navy/15 border-l-4 rounded-xl p-4 space-y-4 shadow-sm ${index % 2 === 0 ? "bg-white/90" : "bg-sky/10"
                          } ${getOrderCardAccentClass(order.status)}`}
                      >
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 pb-4 border-b border-navy/10">
                          <div className="text-sm text-navy/70 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-navy break-words">
                                {customerNameByEmail.get(order.customer_email ?? "") ?? order.customer_email ?? "Guest"}
                              </p>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${getOrderStatusPillClass(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            {order.customer_email && (
                              <p className="text-sm break-words">{order.customer_email}</p>
                            )}
                            <p className="text-sm break-words">{new Date(order.created_at).toLocaleString()}</p>
                            {order.tracking_sent_at && (
                              <p className="text-sm text-emerald-700 mt-1 break-words">
                                Tracking sent: {new Date(order.tracking_sent_at).toLocaleString()}
                              </p>
                            )}
                            <div className="text-sm text-navy/80 pt-2">
                              <p className="font-semibold text-navy">Shipping To:</p>
                              {order.shipping_address ? (
                                <pre className="whitespace-pre-wrap font-sans">{order.shipping_address}</pre>
                              ) : (
                                <p>No shipping address provided.</p>
                              )}
                            </div>
                            {refundOutcomeByOrderId[order.id] && (
                              <span
                                className={`inline-flex mt-2 items-center rounded-full px-2.5 py-1 text-sm font-medium ${refundOutcomeByOrderId[order.id].tone === "success"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : refundOutcomeByOrderId[order.id].tone === "warning"
                                      ? "bg-amber-100 text-amber-800"
                                      : refundOutcomeByOrderId[order.id].tone === "danger"
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-slate-200 text-slate-700"
                                  }`}
                              >
                                {refundOutcomeByOrderId[order.id].label}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-navy/70 min-w-0">
                            <p className="font-semibold text-navy">{order.currency_code} {Number(order.total_amount).toFixed(2)}</p>
                            <p className="text-sm">Items: {order.item_count}</p>
                          </div>
                          <div className="text-sm text-navy/70 min-w-0">
                            <p className="text-sm uppercase tracking-wide text-navy/50 mb-1">Order ID</p>
                            <Input value={order.external_id ?? "N/A"} disabled className="bg-secondary/40 w-full" />
                          </div>
                          <div className="text-sm text-navy/70 min-w-0">
                            <p className="text-sm uppercase tracking-wide text-navy/50 mb-1">Status</p>
                            <select
                              value={order.status}
                              onChange={(e) => {
                                const status = e.target.value;
                                setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
                              }}
                              className={`h-10 w-full rounded-md border px-3 py-2 text-sm font-medium ${getOrderStatusSelectClass(order.status)}`}
                            >
                              <option value="pending">pending</option>
                              <option value="processing">processing</option>
                              <option value="fulfilled">fulfilled</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          </div>
                        </div>

                        <div className="rounded-md border border-navy/10 bg-secondary/20 p-3 space-y-2">
                          <p className="text-sm uppercase tracking-wide text-navy/50">Ordered Products</p>
                          {orderItemsByOrderId[order.id]?.length ? (
                            <div className="space-y-2">
                              {orderItemsByOrderId[order.id].map((item) => (
                                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-navy/70">
                                  <div className="min-w-0">
                                    <p className="font-medium text-navy break-words">{item.product_title}</p>
                                    <p className="text-sm break-words">{item.product_handle}{item.variant_id ? ` • ${item.variant_id}` : ""}</p>
                                    {item.bundle_name && (
                                      <span className="inline-flex items-center rounded-full bg-navy/10 text-navy px-2 py-0.5 text-sm mt-1">
                                        Part of {item.bundle_name}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right text-sm text-navy/60">
                                    <p>Qty {item.quantity}</p>
                                    <p>
                                      {item.currency_code} {Number(item.line_total).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-navy/60">No line items stored yet for this order.</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-start lg:justify-end pt-1">
                          {order.status === "processing" && (
                            <>
                              <Button
                                variant="outline"
                                className="border-sky-300 bg-sky-50 text-sky-900"
                                onClick={() => setScanningOrder(order)}
                              >
                                <Scan className="h-4 w-4 mr-2" />
                                Scan & Fulfill
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => void handleMarkFulfilled(order)}
                                disabled={isSavingOrder === order.id}
                                className="w-full sm:w-auto"
                              >
                                Fulfill Shipment
                              </Button>
                            </>
                          )}
                          {order.status === "fulfilled" && (
                            <Button
                              variant="outline"
                              disabled
                              className="w-full sm:w-auto"
                            >
                              Fulfilled
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            onClick={() => openCancelRefundModal(order)}
                            disabled={isSavingOrder === order.id || order.status === "cancelled"}
                            className="w-full sm:w-auto"
                          >
                            {order.status === "cancelled" ? "Cancelled" : "Cancel & Refund"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openDeleteOrderModal(order)}
                            disabled={isDeletingOrderId === order.id}
                            className="w-full sm:w-auto border-navy/20 text-navy hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete Order
                          </Button>
                        </div>

                        <hr className="border-t border-navy/10 my-4" />

                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-widest font-semibold text-navy/50">Tracking Details</p>
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.4fr] items-end">
                            <Input
                              placeholder="Tracking #"
                              value={order.tracking_number ?? ""}
                              onChange={(e) => {
                                const tracking_number = e.target.value;
                                setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, tracking_number } : o)));
                              }}
                            />
                            <Input
                              placeholder="Carrier"
                              value={order.tracking_carrier ?? ""}
                              onChange={(e) => {
                                const tracking_carrier = e.target.value;
                                setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, tracking_carrier } : o)));
                              }}
                            />
                            <Input
                              placeholder="https://tracking-link"
                              value={order.tracking_url ?? ""}
                              onChange={(e) => {
                                const tracking_url = e.target.value;
                                setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, tracking_url } : o)));
                              }}
                            />
                            <div className="flex flex-wrap gap-2 justify-start lg:justify-end w-full sm:col-span-2 lg:col-span-1">
                              <Button
                                variant="outline"
                                onClick={() => void handleSendTrackingEmail(order)}
                                disabled={isSavingOrder === order.id || !order.customer_email}
                                className="w-full sm:w-auto flex-1 sm:flex-initial"
                              >
                                Send Tracking via Email
                              </Button>
                              <Button
                                onClick={() => void handleSaveOrderStatus(order)}
                                disabled={isSavingOrder === order.id}
                                className="w-full sm:w-auto flex-1 sm:flex-initial"
                              >
                                {isSavingOrder === order.id ? "Saving..." : "Update"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {totalOrderPages > 1 && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <p className="text-sm text-navy/60">
                          Page {ordersPage} of {totalOrderPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="border-navy/20 text-navy hover:bg-navy/5"
                            disabled={ordersPage === 1}
                            onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            className="border-navy/20 text-navy hover:bg-navy/5"
                            disabled={ordersPage >= totalOrderPages}
                            onClick={() => setOrdersPage((prev) => Math.min(totalOrderPages, prev + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isUsersSection && (
            <Card className="border-navy/15 bg-white/95 mb-6">
              <CardHeader>
                <CardTitle className="text-lg text-navy">User Management</CardTitle>
                <CardDescription>
                  View registered customer profiles synced from authenticated sessions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <p className="text-sm text-navy/60">Loading customer profiles...</p>
                ) : customerProfiles.length === 0 ? (
                  <p className="text-sm text-navy/60">No customer profiles found yet.</p>
                ) : (
                  <div className="space-y-3">
                    {paginatedCustomerProfiles.map((profile) => {
                      const fullName = [profile.first_name, profile.last_name]
                        .filter(Boolean)
                        .join(" ")
                        .trim() || "Customer";
                      const profileSessions = sessionsByUserId[profile.id] ?? [];
                      const activeSessionCount = profileSessions.filter((sessionRecord) => !sessionRecord.revoked_at).length;
                      const sessionsPerPage = 4;
                      const totalProfileSessionPages = Math.max(1, Math.ceil(profileSessions.length / sessionsPerPage));
                      const currentSessionPage = Math.min(sessionPages[profile.id] ?? 1, totalProfileSessionPages);
                      const paginatedProfileSessions = profileSessions.slice(
                        (currentSessionPage - 1) * sessionsPerPage,
                        currentSessionPage * sessionsPerPage,
                      );

                      return (
                        <div key={profile.id} className="space-y-3 border border-navy/10 rounded-lg p-3">
                          <div className="grid md:grid-cols-4 gap-3 items-center">
                            <div className="text-sm text-navy/70">
                              <p className="font-semibold text-navy">{fullName}</p>
                              <p className="text-sm">{profile.email}</p>
                            </div>
                            <div className="text-sm text-navy/70">
                              <p className="text-sm uppercase tracking-wide text-navy/50">Registered</p>
                              <p>{new Date(profile.created_at).toLocaleString()}</p>
                            </div>
                            <div className="text-sm text-navy/70">
                              <p className="text-sm uppercase tracking-wide text-navy/50">Last Sign In</p>
                              <p>{profile.last_sign_in_at ? new Date(profile.last_sign_in_at).toLocaleString() : "N/A"}</p>
                            </div>
                            <Input value={profile.id} disabled className="bg-secondary/40" />
                          </div>

                          <div className="rounded-md border border-navy/10 bg-secondary/20 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <p className="text-sm text-navy/70">
                                Active sessions: <span className="font-semibold text-navy">{activeSessionCount}</span>
                              </p>
                              <Button
                                variant="outline"
                                className="border-navy/20 text-navy hover:bg-navy/5"
                                onClick={() => openRevokeAllSessionsModal(profile.id, profile.email, activeSessionCount)}
                                disabled={isRevokingAllForUserId === profile.id || activeSessionCount === 0}
                              >
                                {isRevokingAllForUserId === profile.id ? "Revoking..." : "Revoke All Sessions"}
                              </Button>
                            </div>

                            {profileSessions.length === 0 ? (
                              <p className="text-sm text-navy/60">No session records for this user yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {paginatedProfileSessions.map((sessionRecord) => (
                                  <div key={sessionRecord.id} className="rounded-md border border-navy/10 bg-white/80 p-2.5">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                      <div className="text-sm text-navy/70 space-y-0.5">
                                        <p className="font-medium text-navy">
                                          {sessionRecord.revoked_at ? "Revoked session" : "Active session"}
                                        </p>
                                        <p className="break-words">{sessionRecord.user_agent ?? "Unknown device"}</p>
                                        <p>Last active: {new Date(sessionRecord.last_seen_at).toLocaleString()}</p>
                                        {sessionRecord.revoked_at && (
                                          <p className="text-rose-700">
                                            Revoked: {new Date(sessionRecord.revoked_at).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          variant={sessionRecord.revoked_at ? "outline" : "destructive"}
                                          onClick={() => openRevokeSessionModal(sessionRecord)}
                                          disabled={isRevokingSessionId === sessionRecord.id || Boolean(sessionRecord.revoked_at)}
                                        >
                                          {sessionRecord.revoked_at
                                            ? "Revoked"
                                            : isRevokingSessionId === sessionRecord.id
                                              ? "Revoking..."
                                              : "Revoke"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => openDeleteSessionModal(sessionRecord)}
                                          disabled={isDeletingSessionId === sessionRecord.id}
                                          className="border-navy/20 text-navy hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                        >
                                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {totalProfileSessionPages > 1 && (
                                  <div className="flex items-center justify-between gap-3 pt-1">
                                    <p className="text-sm text-navy/60">
                                      Page {currentSessionPage} of {totalProfileSessionPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        className="border-navy/20 text-navy hover:bg-navy/5"
                                        disabled={currentSessionPage === 1}
                                        onClick={() => handleSessionPageChange(profile.id, Math.max(1, currentSessionPage - 1))}
                                      >
                                        Previous
                                      </Button>
                                      <Button
                                        variant="outline"
                                        className="border-navy/20 text-navy hover:bg-navy/5"
                                        disabled={currentSessionPage >= totalProfileSessionPages}
                                        onClick={() =>
                                          handleSessionPageChange(
                                            profile.id,
                                            Math.min(totalProfileSessionPages, currentSessionPage + 1),
                                          )
                                        }
                                      >
                                        Next
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}


                    {totalUsersPages > 1 && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <p className="text-sm text-navy/60">
                          Page {usersPage} of {totalUsersPages}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="border-navy/20 text-navy hover:bg-navy/5"
                            disabled={usersPage === 1}
                            onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            className="border-navy/20 text-navy hover:bg-navy/5"
                            disabled={usersPage >= totalUsersPages}
                            onClick={() => setUsersPage((prev) => Math.min(totalUsersPages, prev + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isBundlesSection && (
            <Card className="border-navy/15 bg-white/95 mb-6">
              <CardHeader>
                <CardTitle className="text-lg text-navy">Bundle Manager</CardTitle>
                <CardDescription>
                  Bundles are a pricing rule applied at checkout over existing products, not a
                  separate stock item. Select the products included and set the discounted price.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-navy/10 bg-secondary/20 p-3 space-y-3">
                  <p className="text-sm uppercase tracking-wide text-navy/60">
                    {editingBundleId ? "Edit Bundle" : "Add New Bundle"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Handle</p>
                      <Input
                        placeholder="performance-stack"
                        value={bundleForm.handle}
                        onChange={(e) => setBundleForm((prev) => ({ ...prev, handle: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Name</p>
                      <Input
                        placeholder="Performance Stack"
                        value={bundleForm.name}
                        onChange={(e) => setBundleForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Tag (optional)</p>
                      <Input
                        placeholder="Best Value"
                        value={bundleForm.tag}
                        onChange={(e) => setBundleForm((prev) => ({ ...prev, tag: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Sort Order</p>
                      <Input
                        type="number"
                        value={String(bundleForm.sortOrder)}
                        onChange={(e) =>
                          setBundleForm((prev) => ({ ...prev, sortOrder: Number.parseInt(e.target.value, 10) || 0 }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Discount Type</p>
                      <select
                        value={bundleForm.discountType}
                        onChange={(e) =>
                          setBundleForm((prev) => ({ ...prev, discountType: e.target.value as "fixed" | "percentage" }))
                        }
                        className="h-10 w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-sm text-navy"
                      >
                        <option value="fixed">Fixed Amount ($)</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Discount Value</p>
                      <Input
                        placeholder={bundleForm.discountType === "fixed" ? "10.00" : "20"}
                        value={bundleForm.discountValue}
                        onChange={(e) => setBundleForm((prev) => ({ ...prev, discountValue: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Currency</p>
                      <Input
                        placeholder="USD"
                        value={bundleForm.currencyCode}
                        onChange={(e) => setBundleForm((prev) => ({ ...prev, currencyCode: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 rounded-md border border-sky-200 bg-sky-50 p-2 text-sm text-navy/80">
                      <p className="text-sm uppercase tracking-wide text-navy/60">Pricing Preview</p>
                      <p>Original: ${originalPrice.toFixed(2)}</p>
                      <p>Discount: -${discountAmount.toFixed(2)}</p>
                      <p className="font-bold text-navy">Final Price: ${finalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 text-sm text-navy/70 self-end pb-2">
                      <input
                        type="checkbox"
                        checked={bundleForm.active}
                        onChange={(e) => setBundleForm((prev) => ({ ...prev, active: e.target.checked }))}
                      />
                      Active on storefront
                    </label>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm uppercase tracking-wide text-navy/60">Description (optional)</p>
                    <Textarea
                      placeholder="Two ways to stack. One mission: show up stronger every day."
                      value={bundleForm.description}
                      onChange={(e) => setBundleForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="min-h-16"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-wide text-navy/60">
                      Products Included ({bundleForm.productHandles.length} selected)
                    </p>
                    {products.length === 0 ? (
                      <p className="text-sm text-navy/60">No products available yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {products.map((product) => (
                          <label
                            key={product.id}
                            className="inline-flex items-center gap-2 text-sm text-navy/70 rounded-md border border-navy/10 bg-white/70 px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={bundleForm.productHandles.includes(product.handle)}
                              onChange={() => handleToggleBundleProductHandle(product.handle)}
                            />
                            <span className="truncate">{product.title || product.handle}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={() => void handleSaveBundle()} disabled={isSavingBundle}>
                      {isSavingBundle ? "Saving..." : editingBundleId ? "Save Bundle" : "Add Bundle"}
                    </Button>
                    {editingBundleId && (
                      <Button type="button" variant="outline" className="border-navy/20 text-navy hover:bg-navy/5" onClick={resetBundleForm}>
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-wide text-navy/60">Existing Bundles</p>
                  {isLoadingData ? (
                    <p className="text-sm text-navy/60">Loading bundles...</p>
                  ) : bundles.length === 0 ? (
                    <p className="text-sm text-navy/60">No bundles created yet.</p>
                  ) : (
                    bundles.map((bundle) => (
                      <div key={bundle.id} className="border border-navy/10 rounded-lg p-4 bg-white/80">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-navy">{bundle.name}</p>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${bundle.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                                  }`}
                              >
                                {bundle.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="text-sm text-navy/60">Handle: {bundle.handle}</p>
                            <p className="text-sm text-navy/60">
                              {bundle.currency_code} {bundle.price.toFixed(2)} • {bundle.product_handles.length} products
                            </p>
                            {bundle.discount_value != null && (
                              <p className="text-sm font-medium text-emerald-700">
                                Discount:{" "}
                                {bundle.discount_type === "percentage"
                                  ? `${bundle.discount_value}%`
                                  : `$${Number(bundle.discount_value).toFixed(2)}`}{" "}
                                off
                              </p>
                            )}
                            <p className="text-sm text-navy/70">{bundle.product_handles.join(", ")}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" className="border-navy/20 text-navy hover:bg-navy/5" onClick={() => handleEditBundle(bundle)}>
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => openBundleDeleteModal(bundle)}
                              disabled={isDeletingBundleId === bundle.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {isDeletingBundleId === bundle.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isInsightsSection && (
            <div className="grid md:grid-cols-3 gap-5">
              <Card className="border-navy/15 bg-white/95">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-navy">
                    <UsersRound className="h-5 w-5 text-orange" /> Customer Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-navy/70 space-y-2">
                  <p>
                    <span className="font-semibold text-navy">Total profiles:</span> {insights.totalCustomers}
                  </p>
                  <p>
                    <span className="font-semibold text-navy">Signed in last 30 days:</span> {insights.customersWithRecentSignIn}
                  </p>
                  <p className="text-sm text-navy/60">
                    Active sign-ins are based on `last_sign_in_at` in customer profiles.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-navy/15 bg-white/95">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-navy">
                    <BarChart3 className="h-5 w-5 text-orange" /> Sales Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-navy/70 space-y-2">
                  <p>
                    <span className="font-semibold text-navy">Orders (7d):</span> {insights.ordersLast7Days}
                  </p>
                  <p>
                    <span className="font-semibold text-navy">Revenue (7d):</span> {metrics.currencyCode} {insights.revenueLast7Days.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-semibold text-navy">AOV (7d):</span> {metrics.currencyCode} {insights.averageOrderValue.toFixed(2)}
                  </p>
                  <p>
                    <span className="font-semibold text-navy">Top product:</span>{" "}
                    {insights.topProduct ? `${insights.topProduct.title} (${insights.topProduct.qty} sold)` : "No item data yet"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-navy/15 bg-white/95">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-navy">
                    <ShieldAlert className="h-5 w-5 text-orange" /> Security Monitor
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-navy/70 space-y-2">
                  <p>
                    <span className="font-semibold text-navy">Cancelled orders:</span> {insights.cancelledOrders}
                  </p>
                  <p>
                    <span className="font-semibold text-navy">Fulfilled without tracking:</span> {insights.fulfilledWithoutTracking}
                  </p>
                  <p className="text-sm text-navy/60">
                    Use this panel as an operational risk checklist while deeper security logs are added.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />

      {scanningOrder && (
        <UPCScannerModal
          order={scanningOrder}
          items={orderItemsByOrderId[scanningOrder.id] ?? []}
          products={products}
          onClose={() => setScanningOrder(null)}
          onFulfill={handleMarkFulfilled}
        />
      )}

      <AlertDialog open={Boolean(revokeAccessTarget)} onOpenChange={(open) => { if (!open) setRevokeAccessTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeAccessTarget?.kind === "session"
                ? "This will immediately revoke this device session. The user will be signed out automatically on their next session check."
                : revokeAccessTarget?.kind === "user"
                  ? `This will revoke ${revokeAccessTarget.activeSessionCount} active session${revokeAccessTarget.activeSessionCount === 1 ? "" : "s"} for ${revokeAccessTarget.email}.`
                  : "Confirm access revocation."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={
                (revokeAccessTarget?.kind === "session" && isRevokingSessionId === revokeAccessTarget.sessionRecord.id) ||
                (revokeAccessTarget?.kind === "user" && isRevokingAllForUserId === revokeAccessTarget.userId)
              }
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmRevokeAccess()}
              disabled={
                !revokeAccessTarget ||
                (revokeAccessTarget.kind === "session" && isRevokingSessionId === revokeAccessTarget.sessionRecord.id) ||
                (revokeAccessTarget.kind === "user" && isRevokingAllForUserId === revokeAccessTarget.userId)
              }
            >
              {revokeAccessTarget?.kind === "session" && isRevokingSessionId === revokeAccessTarget.sessionRecord.id
                ? "Revoking..."
                : revokeAccessTarget?.kind === "user" && isRevokingAllForUserId === revokeAccessTarget.userId
                  ? "Revoking..."
                  : "Revoke Access"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(cancelRefundTarget)} onOpenChange={(open) => { if (!open) setCancelRefundTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel And Refund Order</AlertDialogTitle>
            <AlertDialogDescription>
              {`Cancel and refund this order for ${cancelRefundTarget?.order.customer_email ?? "this customer"}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(cancelRefundTarget?.order && isSavingOrder === cancelRefundTarget.order.id)}>
              Keep Order
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmCancelAndRefund()}
              disabled={!cancelRefundTarget || isSavingOrder === cancelRefundTarget.order.id}
            >
              {cancelRefundTarget && isSavingOrder === cancelRefundTarget.order.id ? "Processing..." : "Cancel & Refund"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(productDeleteTarget)} onOpenChange={(open) => { if (!open) setProductDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              {`Delete ${productDeleteTarget?.product.title || "this product"}? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(productDeleteTarget?.product && isDeletingProduct === productDeleteTarget.product.id)}>
              Keep Product
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteProduct()}
              disabled={!productDeleteTarget || isDeletingProduct === productDeleteTarget.product.id}
            >
              {productDeleteTarget && isDeletingProduct === productDeleteTarget.product.id ? "Deleting..." : "Delete Product"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(bundleDeleteTarget)} onOpenChange={(open) => { if (!open) setBundleDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
            <AlertDialogDescription>
              {`Delete ${bundleDeleteTarget?.name || "this bundle"}? This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(bundleDeleteTarget && isDeletingBundleId === bundleDeleteTarget.id)}>
              Keep Bundle
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteBundle()}
              disabled={!bundleDeleteTarget || isDeletingBundleId === bundleDeleteTarget.id}
            >
              {bundleDeleteTarget && isDeletingBundleId === bundleDeleteTarget.id ? "Deleting..." : "Delete Bundle"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(removeImageTarget)} onOpenChange={(open) => { if (!open) setRemoveImageTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this image from the product? This change is not saved until you click Save.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeImageTarget && (
            <img
              src={removeImageTarget.url}
              alt="Image to remove"
              className="h-20 w-20 rounded-md border border-navy/10 object-cover bg-white"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Image</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmRemoveImage}>
              Remove Image
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteSessionTarget)} onOpenChange={(open) => { if (!open) setDeleteSessionTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this session record from this user's history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSessionId !== null}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteSession()}
              disabled={!deleteSessionTarget || isDeletingSessionId !== null}
            >
              {isDeletingSessionId === deleteSessionTarget?.id ? "Deleting..." : "Delete Session"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteOrderTarget)} onOpenChange={(open) => { if (!open) setDeleteOrderTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this order record? This will also delete all associated product line items from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingOrderId !== null}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteOrder()}
              disabled={!deleteOrderTarget || isDeletingOrderId !== null}
            >
              {isDeletingOrderId === deleteOrderTarget?.id ? "Deleting..." : "Delete Order"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
