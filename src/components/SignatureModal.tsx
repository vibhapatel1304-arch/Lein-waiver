import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, RotateCcw, Check } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const sigPadRef = useRef<SignatureCanvas>(null);

  if (!isOpen) return null;

  const handleClear = () => {
    sigPadRef.current?.clear();
  };

  const handleSave = () => {
    if (sigPadRef.current?.isEmpty()) return;
    const base64 = sigPadRef.current?.getTrimmedCanvas().toDataURL('image/png');
    if (base64) {
      onSave(base64);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <h3 className="font-semibold text-slate-800">Draw Your Signature</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
            <SignatureCanvas
              ref={sigPadRef}
              penColor="#1e293b"
              canvasProps={{
                className: 'w-full h-64 cursor-crosshair'
              }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center italic">
            Use your mouse or touch screen to sign above
          </p>
        </div>

        <div className="p-4 bg-slate-50 border-t flex items-center justify-between gap-3">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            <RotateCcw size={16} />
            Clear
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
            >
              <Check size={16} />
              Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
