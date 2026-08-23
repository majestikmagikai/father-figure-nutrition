
import { useEffect, useState, useMemo, useRef } from 'react';
import type { OrderRecord, OrderItemRecord, InventoryProduct } from '@/lib/adminData';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Camera, ShieldAlert } from 'lucide-react';

// Web Audio API helper to generate programmatic beeps
const playBeep = (freq = 800, duration = 150, type: OscillatorType = 'sine') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // Smooth out volume to prevent pops or clipping at start/end
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (err) {
    console.warn('Audio feedback failed:', err);
  }
};

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
  const [isDetectorSupported, setIsDetectorSupported] = useState<boolean | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const lastCodeRef = useRef('');
  const lastTimeRef = useRef(0);

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

  // Keep mutable ref to avoid restarting the camera loop on scanned items state changes
  const scanStateRef = useRef({ productUPCs, requiredItems, scannedItems });
  useEffect(() => {
    scanStateRef.current = { productUPCs, requiredItems, scannedItems };
  }, [productUPCs, requiredItems, scannedItems]);

  // Shared business logic to handle dynamic scanned codes
  const handleCodeScanned = (code: string) => {
    const now = Date.now();

    // Throttles successive duplicate scans of the same code within 1.5 seconds
    if (code !== lastCodeRef.current || now - lastTimeRef.current > 1500) {
      lastCodeRef.current = code;
      lastTimeRef.current = now;
      setLastScanned(code);

      const { productUPCs: upcMap, requiredItems: reqMap, scannedItems: scanMap } = scanStateRef.current;
      const handle = upcMap.get(code);

      if (handle && reqMap.has(handle)) {
        const requiredQty = reqMap.get(handle) ?? 0;
        const currentCount = scanMap[handle] || 0;

        if (currentCount < requiredQty) {
          setScannedItems(prev => ({ ...prev, [handle]: (prev[handle] || 0) + 1 }));
          playBeep(880, 120, 'sine');
        } else {
          playBeep(330, 200, 'triangle');
        }
      } else {
        playBeep(180, 300, 'sawtooth');
      }
    }
  };

  // Check native browser BarcodeDetector API support
  useEffect(() => {
    setIsDetectorSupported('BarcodeDetector' in window);
  }, []);

  // Handle permission initialization, stream setup, and active frame analysis loop
  useEffect(() => {
    if (isDetectorSupported === false || isDetectorSupported === null) return;

    let active = true;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        setHasPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access failed:', err);
        if (active) {
          setHasPermission(false);
        }
      }
    };

    startCamera();

    // @ts-ignore
    const barcodeDetector = new window.BarcodeDetector({
      formats: ['upc_a', 'upc_e', 'ean_13'],
    });

    let lastCode = '';
    let lastTime = 0;

    const tick = async () => {
      if (!active) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          const detectedBarcodes = await barcodeDetector.detect(video);
          if (detectedBarcodes.length > 0 && active) {
            handleCodeScanned(detectedBarcodes[0].rawValue);
          }
        } catch (err) {
          // Silence transient black-frame processing errors
        }
      }

      if (active) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isDetectorSupported]);

  // Fallback compatibility path: Load html5-qrcode dynamically on Firefox
  useEffect(() => {
    if (isDetectorSupported !== false) return;

    if ((window as any).Html5Qrcode) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, [isDetectorSupported]);

  // Initialize Fallback scanner once compatibility scripts are dynamically loaded
  useEffect(() => {
    if (isDetectorSupported !== false || !scriptLoaded) return;

    let html5QrcodeScanner: any = null;
    let active = true;

    const startFallbackScanner = async () => {
      try {
        html5QrcodeScanner = new (window as any).Html5Qrcode("fallback-reader");
        
        await html5QrcodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            formatsToSupport: [
              (window as any).Html5QrcodeSupportedFormats.UPC_A,
              (window as any).Html5QrcodeSupportedFormats.UPC_E,
              (window as any).Html5QrcodeSupportedFormats.EAN_13,
            ]
          },
          (decodedText: string) => {
            if (active) {
              handleCodeScanned(decodedText);
            }
          },
          () => {
            // Silence verbose frame-level parsing errors
          }
        );
        setHasPermission(true);
      } catch (err) {
        console.error("Fallback scanner initialization failed:", err);
        setHasPermission(false);
      }
    };

    const timer = setTimeout(() => void startFallbackScanner(), 100);

    return () => {
      active = false;
      clearTimeout(timer);
      if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().catch(() => {});
      }
    };
  }, [isDetectorSupported, scriptLoaded]);

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
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center border border-gray-200 shadow-inner">
              {isDetectorSupported === false && (
                <div className="p-4 text-center text-red-600 space-y-2">
                  <ShieldAlert className="mx-auto h-8 w-8" />
                  <p className="text-sm font-semibold">Native Barcode API Unsupported</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Please switch to Chrome or another modern Chromium-based browser to activate native device scanning.
                  </p>
                </div>
              )}

              {isDetectorSupported === true && hasPermission === null && (
                <div className="text-center text-gray-400 space-y-2">
                  <Camera className="mx-auto h-8 w-8 animate-pulse" />
                  <p className="text-xs">Requesting camera access...</p>
                </div>
              )}

              {isDetectorSupported === true && hasPermission === false && (
                <div className="p-4 text-center text-red-600 space-y-2">
                  <ShieldAlert className="mx-auto h-8 w-8" />
                  <p className="text-sm font-semibold">Camera Access Denied</p>
                  <p className="text-xs text-gray-500">Please unlock permission access inside your browser settings.</p>
                </div>
              )}

              {isDetectorSupported === true && hasPermission === true && (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-dashed border-orange/40 rounded-lg pointer-events-none m-6 flex items-center justify-center" />
                  {lastScanned && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[11px] font-mono px-3 py-0.5 rounded-full">Scanned: {lastScanned}</span>}
                </>
              )}
            </div>
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
