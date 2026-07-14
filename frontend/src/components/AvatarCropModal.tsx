import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Check, LoaderCircle, X, ZoomIn, ZoomOut } from "lucide-react";

interface AvatarCropModalProps {
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      const size = Math.min(pixelCrop.width, pixelCrop.height, 400);
      canvas.width = size;
      canvas.height = size;

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        size,
        size
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        },
        "image/png"
      );
    };
    image.onerror = () => reject(new Error("Image load failed"));
  });
}

export function AvatarCropModal({ imageSrc, onConfirm, onCancel }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(blob);
    } catch {
      onCancel();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="mx-4 flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">调整头像</h3>
          <button
            className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            type="button"
            onClick={onCancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500">拖动调整位置，滑动滚轮缩放大小</p>

        <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-slate-900">
          <Cropper
            aspect={1}
            crop={crop}
            cropShape="round"
            image={imageSrc}
            showGrid={false}
            zoom={zoom}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-indigo-100 accent-indigo-500"
            max={3}
            min={1}
            step={0.01}
            type="range"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" />
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
            disabled={processing}
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
          >
            {processing ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                确认
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
