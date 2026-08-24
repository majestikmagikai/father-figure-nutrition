import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const helpTopics = [
  { id: "navigation", title: "Admin Menu & Navigation" },
  { id: "metrics", title: "Metrics" },
  { id: "products", title: "Products" },
  { id: "orders", title: "Orders" },
  { id: "users", title: "Users" },
  { id: "bundles", title: "Bundles" },
  { id: "insights", title: "Insights" },
];

const AdminHelpPage = () => {
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-navy/70 hover:text-orange transition-colors mb-8 font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard
          </Link>
          <Card className="border-navy/15 shadow-card bg-white/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-navy">
                <HelpCircle className="h-6 w-6 text-orange" />
                Admin Dashboard Guide
              </CardTitle>
              <CardDescription>
                Learn how to navigate and use the features of the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-[250px_1fr] gap-8">
              <aside className="hidden md:block sticky top-24 self-start">
                <h3 className="font-semibold text-navy mb-3 uppercase tracking-wider">Topics</h3>
                <ul className="space-y-2">
                  {helpTopics.map((topic) => (
                    <li key={topic.id}>
                      <a
                        href={`#${topic.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollTo(topic.id);
                        }}
                        className="text-sm text-navy/70 hover:text-orange hover:underline"
                      >
                        {topic.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </aside>
              <div className="space-y-8 text-sm text-navy/80">
                <section id="navigation" className="space-y-2 scroll-mt-24">
                  <h3 className="font-display text-lg uppercase tracking-wide text-navy border-b border-navy/10 pb-2 mb-3">Admin Menu & Navigation</h3>
                  <p>
                    The admin dashboard is organized into several sections, accessible via the "Admin Menu". Click on a button to navigate to the corresponding page for managing a specific area of your store.
                  </p>
                </section>

                <section id="metrics" className="space-y-2 scroll-mt-24">
                  <h3 className="font-display text-lg uppercase tracking-wide text-navy border-b border-navy/10 pb-2 mb-3">Metrics</h3>
                  <p>
                    The <strong>Metrics</strong> page provides a high-level overview of your store's performance.
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                    <li><strong>Sales:</strong> Total processed revenue from all completed orders.</li>
                    <li><strong>Total Orders:</strong> The total count of completed checkout records.</li>
                    <li><strong>Active Users:</strong> The number of unique customers who have placed at least one order.</li>
                  </ul>
                </section>

                <section id="products" className="space-y-4 scroll-mt-24">
                  <h3 className="font-display text-lg uppercase tracking-wide text-navy border-b border-navy/10 pb-2 mb-3">Products</h3>
                  <p>
                    The <strong>Products</strong> section is for managing your inventory. It's split into a list view and an editor.
                  </p>
                  <div className="pl-4 mt-2 space-y-4">
                    <h4 className="font-semibold text-navy">Products List</h4>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      <li>View all your products with pagination.</li>
                      <li><strong>Reorder:</strong> Drag and drop products using the grip icon to change their display order on the storefront. The new order is saved automatically.</li>
                      <li><strong>Inventory CSV:</strong> Export your current inventory's stock levels or import a CSV to update stock quantities in bulk. The CSV must contain `id` or `sku`, and `stock_quantity`. `low_stock_threshold` is optional.</li>
                      <li>Click "Edit Product" to go to the detailed editor for that product.</li>
                      <li>Click "Add New Product" to create a new product from scratch.</li>
                    </ul>
                    <h4 className="font-semibold text-navy mt-2">Product Editor (Edit/Add New)</h4>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      <li><strong>Core Info:</strong> Set the product's `handle` (URL slug), `title`, `price`, and Shopify `variantId`.</li>
                      <li><strong>Inventory:</strong> Manage `SKU`, `Stock Quantity`, and `Low Stock Threshold`.</li>
                      <li><strong>Descriptions:</strong> Use the "Short Description" for a quick summary and the "Full Description" rich text editor for detailed content. A live preview is shown.</li>
                      <li>
                        <strong>Visuals & Media:</strong>
                        <ul className="list-disc list-inside ml-4 space-y-1 mt-1">
                          <li>Upload product images (auto-converted to WebP) and 3D models (.glb).</li>
                          <li>Manage image order by dragging, or remove images. The first image is the primary one.</li>
                          <li>Set `Cap Color` and `Fill Color` for the 3D viewer.</li>
                          <li>Toggle `Available for Sale` to control visibility on the storefront.</li>
                          <li>Toggle `Enable 3D Viewer` to show the interactive 3D model on the product page.</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </section>

                <section id="orders" className="space-y-2 scroll-mt-24">
                  <h3 className="font-display text-lg uppercase tracking-wide text-navy border-b border-navy/10 pb-2 mb-3">Orders</h3>
                  <p>
                    The <strong>Orders</strong> page is for fulfillment and customer service.
                  </p>
                  <ul className="list-disc list-inside space-y-2 mt-2 pl-4">
                    <li><strong>Search & Sort:</strong> Find orders by customer name, email, order ID, or tracking number. Sort by date, amount, or status.</li>
                    <li><strong>Update Status:</strong> Change an order's status (e.g., from `processing` to `fulfilled`).</li>
                    <li><strong>Tracking Details:</strong> Add a tracking number, carrier, and URL. Click "Update" to save.</li>
                    <li><strong>Send Tracking Email:</strong> After adding tracking info, click "Send Tracking via Email" to open a pre-filled `mailto:` link to send to the customer.</li>
                    <li><strong>Scan & Fulfill:</strong> Use the UPC scanner with your device's camera to scan product barcodes and verify items for an order. Once all items are scanned, you can mark the order as fulfilled.</li>
                    <li><strong>Cancel & Refund:</strong> This action will attempt to cancel the payment authorization and/or issue a refund via Stripe, and sets the order status to `cancelled`.</li>
                    <li><strong>Delete Order:</strong> Permanently removes the order record from the database. This is a destructive action and should be used with caution.</li>
                  </ul>
                </section>

                <section id="users" className="space-y-2 scroll-mt-24">
                  <h3 className="font-display text-lg uppercase tracking-wide text-navy border-b border-navy/10 pb-2 mb-3">Users</h3>
                  <p>
                    The <strong>Users</strong> page allows you to manage customer accounts and their active sessions.
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                    <li>View a list of all registered customers.</li>
                    <li>For each user, you can see their session history (devices they've logged in from).</li>
                    <li><strong>Revoke Session:</strong> Remotely sign out a specific device.</li>
                    <li><strong>Revoke All Sessions:</strong> Remotely sign out all devices for a user.</li>
                    <li><strong>Delete Session:</strong> Permanently remove a historical session record.</li>
                  </ul>
                </section>

                <section id="bundles" className="space-y-2 scroll-mt-24">
                  <h3 className="font-display text-lg uppercase tracking-wide text-navy border-b border-navy/10 pb-2 mb-3">Bundles</h3>
                  <p>
                    The <strong>Bundles</strong> section lets you create and manage product bundles. Bundles are pricing rules, not separate inventory items.
                  </p>
                  <div className="pl-4 mt-2 space-y-2">
                    <h4 className="font-semibold text-navy">Create a Bundle:</h4>
                    <ul className="list-disc list-inside space-y-1 pl-4">
                      <li>Define a unique `handle`, a `name`, and an optional `tag` (like "Best Value").</li>
                      <li>Set a discount, either a `fixed amount` ($) or a `percentage` (%).</li>
                      <li>Select at least two products to include in the bundle.</li>
                      <li>The final price is calculated and shown in the preview.</li>
                    </ul>
                    <h4 className="font-semibold text-navy mt-2">Manage Bundles:</h4>
                     <ul className="list-disc list-inside space-y-1 pl-4">
                       <li>Edit or delete existing bundles from the list. Deleting a bundle does not affect past orders.</li>
                     </ul>
                  </div>
                </section>

                <section id="insights" className="space-y-2 scroll-mt-24">
                  <h3 className="font-display text-lg uppercase tracking-wide text-navy border-b border-navy/10 pb-2 mb-3">Insights</h3>
                   <p>
                    The <strong>Insights</strong> page provides key operational metrics and at-a-glance reports.
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2 pl-4">
                    <li><strong>Customer Access:</strong> See total customer profiles and how many have signed in recently.</li>
                    <li><strong>Sales Overview:</strong> Review recent sales trends, including 7-day revenue, order count, and average order value (AOV).</li>
                    <li><strong>Security Monitor:</strong> A quick checklist for operational risks, such as the number of cancelled orders or orders fulfilled without a tracking number.</li>
                  </ul>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default AdminHelpPage;