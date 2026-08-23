
import { useEffect, useState, useMemo } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import type { OrderRecord, OrderItemRecord, InventoryProduct } from '@/lib/adminData';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X } from 'lucide-react';

interface UPCScannerModalProps {
  order: OrderRecord;
  items: OrderItemRecord[];
  products: InventoryProduct[];
  onClose: () => void;
  onFulfill: (order: OrderRecord) => Promise<void>;
}

export const UPCScannerModal = ({ order, items, products, onClose, onFulfill }: UPCScannerModalProps) => {
  const [scannedItems, setScannedItems] = useState<Record<string, number>>({});
  const [isFulfilling, setIsFulfilling] = useState(false);

  const productUPCs = useMemo(() => {
    return new Map(products.map(p => [p.upc, p.handle]));
  }, [products]);

  const requiredItems = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
        map.set(item.product_handle, (map.get(item.product_handle) || 0) + item.quantity);
    }
    return map;
  }, [items]);

  const isOrderFulfilled = useMemo(() => {
    if (requiredItems.size === 0) return false;
    for (const [handle, requiredQty] of requiredItems.entries()) {
      if ((scannedItems[handle] || 0) < requiredQty) {
        return false;
      }
    }
    return true;
  }, [scannedItems, requiredItems]);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'upc-scanner-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        rememberLastUsedCamera: true,
      },
      false,
    );

    const onScanSuccess = (decodedText: string) => {
      const handle = productUPCs.get(decodedText);
      if (handle && requiredItems.has(handle)) {
        setScannedItems(prev => {
          const newCount = (prev[handle] || 0) + 1;
          if (newCount > (requiredItems.get(handle) ?? 0)) {
            // Optional: notify user they scanned an extra item
            return prev;
          }
          return { ...prev, [handle]: newCount };
        });
      } else {
        // Optional: notify user of invalid scan
      }
    };

    scanner.render(onScanSuccess, undefined);

    return () => {
      scanner.clear().catch(error => {
        console.error("Failed to clear html5-qrcode-scanner.", error);
      });
    };
  }, [productUPCs, requiredItems]);

  const handleFulfill = async () => {
    if (!isOrderFulfilled) return;
    setIsFulfilling(true);
    try {
      await onFulfill(order);
      onClose();
    } finally {
      setIsFulfilling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <X size={24} />
        </button>
        <CardHeader>
          <CardTitle>Scan Items for Order #{order.id.slice(0, 8)}</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <div id="upc-scanner-reader" className="w-full"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Order Items</h3>
            <ul className="space-y-2">
              {items.map(item => (
                <li key={item.id} className="flex justify-between items-center p-2 rounded-md bg-gray-50">
                  <span>{item.product_title}</span>
                  <span className={`font-mono px-2 py-1 rounded ${
                    (scannedItems[item.product_handle] || 0) >= item.quantity ? 'bg-green-200 text-green-800' : 'bg-gray-200'
                  }`}>
                    {scannedItems[item.product_handle] || 0} / {item.quantity}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              onClick={handleFulfill}
              disabled={!isOrderFulfilled || isFulfilling}
              className="w-full mt-4"
            >
              {isFulfilling ? 'Fulfilling...' : 'Mark as Fulfilled'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
