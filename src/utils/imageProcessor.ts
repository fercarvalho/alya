import imageCompression from 'browser-image-compression';

/**
 * Processa uma imagem convertendo para WebP, redimensionando e comprimindo
 * @param file Arquivo de imagem original
 * @returns Promise<File> Arquivo WebP processado
 */
export async function processImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 2, // Tamanho máximo após compressão
    maxWidthOrHeight: 400, // Dimensão máxima mantendo proporção
    useWebWorker: true, // Usar Web Worker para melhor performance
    fileType: 'image/webp', // Converter para WebP
    initialQuality: 0.8 // Qualidade inicial (0-1)
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    throw new Error('Falha ao processar imagem. Por favor, tente novamente.');
  }
}

/**
 * Recorta uma imagem baseado nas coordenadas do crop
 * @param imageFile Arquivo de imagem
 * @param cropArea Área de crop com coordenadas x, y, width, height
 * @returns Promise<File> Arquivo recortado
 */
export async function cropImage(
  imageFile: File,
  cropArea: { x: number; y: number; width: number; height: number }
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }
        
        // Definir dimensões do canvas como a área de crop
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        
        // Desenhar a parte recortada da imagem no canvas
        ctx.drawImage(
          img,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        );
        
        // Converter canvas para Blob e depois para File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao criar blob da imagem recortada'));
              return;
            }
            
            const croppedFile = new File(
              [blob],
              imageFile.name.replace(/\.[^/.]+$/, '.webp'),
              { type: 'image/webp' }
            );
            
            resolve(croppedFile);
          },
          'image/webp',
          0.95 // Qualidade WebP
        );
      };
      
      img.onerror = () => {
        reject(new Error('Erro ao carregar imagem'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsDataURL(imageFile);
  });
}
