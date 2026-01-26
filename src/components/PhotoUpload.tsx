import React, { useState, useRef } from 'react';
import { Upload, X, Crop } from 'lucide-react';
import { processImage } from '../utils/imageProcessor';
import ImageCrop from './ImageCrop';

interface PhotoUploadProps {
  onPhotoProcessed?: (file: File) => void;
  onPhotoRemoved?: () => void;
  initialPhotoUrl?: string;
  disabled?: boolean;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onPhotoProcessed,
  onPhotoRemoved,
  initialPhotoUrl,
  disabled = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPhotoUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Por favor, selecione uma imagem válida (JPG, PNG ou WebP)');
      return;
    }

    // Validar tamanho (2MB antes do processamento)
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    setSelectedFile(file);
    
    // Criar preview da imagem original
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Preparar para crop (usuário pode escolher recortar ou não)
    setImageToCrop(file);
  };

  const handleCropComplete = async (croppedFile: File) => {
    setImageToCrop(null);
    setShowCropModal(false);
    await processAndSetFile(croppedFile);
  };

  const handleSkipCrop = async () => {
    if (selectedFile) {
      setShowCropModal(false);
      setImageToCrop(null);
      await processAndSetFile(selectedFile);
    }
  };

  const processAndSetFile = async (file: File) => {
    setIsProcessing(true);
    try {
      const processed = await processImage(file);
      setProcessedFile(processed);
      onPhotoProcessed?.(processed);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      alert('Erro ao processar imagem. Por favor, tente novamente.');
      handleRemovePhoto();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setProcessedFile(null);
    setPreviewUrl(initialPhotoUrl || null);
    setImageToCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onPhotoRemoved?.();
  };

  const handleOpenCrop = () => {
    if (imageToCrop) {
      setShowCropModal(true);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {/* Área de upload */}
        {!previewUrl && (
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
              transition-all duration-200 min-h-[120px] flex items-center justify-center
              ${disabled 
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                : 'border-amber-300 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-400'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className={`w-8 h-8 ${disabled ? 'text-gray-400' : 'text-amber-600'}`} />
              <span className={`text-sm ${disabled ? 'text-gray-500' : 'text-gray-700'}`}>
                Clique para selecionar uma foto
              </span>
              <span className="text-xs text-gray-500">
                JPG, PNG ou WebP (máx. 2MB)
              </span>
            </div>
          </div>
        )}

        {/* Preview da imagem */}
        {previewUrl && (
          <div className="relative w-full max-w-[200px] sm:max-w-[300px] md:max-w-[400px] mx-auto">
            <div className="relative rounded-lg overflow-hidden border-2 border-amber-200 bg-gray-50">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-[300px] object-contain"
              />
              
              {/* Overlay com opções */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                {!disabled && imageToCrop && (
                  <>
                    <button
                      onClick={handleOpenCrop}
                      className="min-w-[44px] min-h-[44px] bg-white/90 hover:bg-white rounded-full p-2 flex items-center justify-center shadow-lg transition-all"
                      title="Recortar imagem"
                    >
                      <Crop className="w-5 h-5 text-amber-600" />
                    </button>
                    <button
                      onClick={handleSkipCrop}
                      className="min-w-[44px] min-h-[44px] bg-white/90 hover:bg-white rounded-full p-2 flex items-center justify-center shadow-lg transition-all"
                      title="Usar imagem sem recortar"
                    >
                      <Upload className="w-5 h-5 text-green-600" />
                    </button>
                  </>
                )}
                {!disabled && (
                  <button
                    onClick={handleRemovePhoto}
                    className="min-w-[44px] min-h-[44px] bg-white/90 hover:bg-white rounded-full p-2 flex items-center justify-center shadow-lg transition-all"
                    title="Remover foto"
                  >
                    <X className="w-5 h-5 text-red-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Indicador de processamento */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                <div className="bg-white rounded-lg p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  <p className="mt-2 text-sm text-gray-700">Processando...</p>
                </div>
              </div>
            )}

            {/* Botões de ação (sempre visíveis em mobile) */}
            {!disabled && imageToCrop && (
              <div className="mt-2 flex gap-2 justify-center sm:hidden">
                <button
                  onClick={handleOpenCrop}
                  className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Crop className="w-4 h-4" />
                  Recortar
                </button>
                <button
                  onClick={handleSkipCrop}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Usar
                </button>
                <button
                  onClick={handleRemovePhoto}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Remover
                </button>
              </div>
            )}
          </div>
        )}

        {/* Botão para trocar foto */}
        {previewUrl && !imageToCrop && !disabled && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-2 text-sm text-amber-600 hover:text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
          >
            Trocar foto
          </button>
        )}
      </div>

      {/* Modal de Crop */}
      {showCropModal && imageToCrop && (
        <ImageCrop
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false);
            setImageToCrop(null);
          }}
        />
      )}
    </>
  );
};

export default PhotoUpload;
