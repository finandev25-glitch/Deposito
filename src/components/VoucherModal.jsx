import React from "react";
import { motion } from "framer-motion";
import { X, Download } from "lucide-react";

const VoucherModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("No se pudo obtener el archivo del servidor.");
      }
      const blob = await response.blob();

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);

      const urlPath = new URL(imageUrl).pathname;
      const filename =
        urlPath.substring(urlPath.lastIndexOf("/") + 1) || "voucher";
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error al descargar el archivo:", error);
      window.open(imageUrl, "_blank");
      alert(
        "No se pudo descargar el archivo directamente. Se abrirá en una nueva pestaña para que puedas guardarlo manually."
      );
    }
  };

  const isPdf = imageUrl.toLowerCase().includes(".pdf");

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-lg p-2 max-w-6xl w-full max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-4 -right-4 flex space-x-2 z-10">
          <button
            onClick={handleDownload}
            className="bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-200 transition-colors"
            aria-label="Descargar"
            title="Descargar"
          >
            <Download className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={onClose}
            className="bg-white rounded-full p-1.5 shadow-lg hover:bg-gray-200 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6 text-gray-700" />
          </button>
        </div>

        <div className="h-full w-full flex-1 min-h-0">
          {isPdf ? (
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    � Controles PDF:
                  </span>
                  <button
                    onClick={() => {
                      // Crear una nueva ventana con controles de navegador completos
                      const newWindow = window.open(
                        "",
                        "pdf-viewer-full",
                        "width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=yes"
                      );
                      if (newWindow) {
                        newWindow.document.write(`
                          <html>
                            <head>
                              <title>Visualizador PDF Completo - ${
                                title || "Documento"
                              }</title>
                              <style>
                                body { 
                                  margin: 0; 
                                  padding: 0; 
                                  background: #1f2937; 
                                  font-family: system-ui, -apple-system, sans-serif;
                                }
                                .header { 
                                  background: linear-gradient(135deg, #1e40af, #3b82f6); 
                                  color: white; 
                                  padding: 15px 20px; 
                                  display: flex; 
                                  justify-content: space-between; 
                                  align-items: center;
                                  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                                }
                                .title { 
                                  font-size: 18px; 
                                  font-weight: 600;
                                  margin: 0;
                                }
                                .controls { 
                                  display: flex; 
                                  gap: 12px; 
                                  align-items: center;
                                }
                                .btn { 
                                  background: rgba(255,255,255,0.9); 
                                  color: #1e40af; 
                                  border: none; 
                                  padding: 10px 16px; 
                                  border-radius: 6px; 
                                  cursor: pointer;
                                  font-size: 14px;
                                  font-weight: 500;
                                  transition: all 0.2s ease;
                                  display: flex;
                                  align-items: center;
                                  gap: 6px;
                                }
                                .btn:hover { 
                                  background: #fff; 
                                  transform: translateY(-1px);
                                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                }
                                .btn.danger { 
                                  background: rgba(239,68,68,0.9); 
                                  color: white; 
                                }
                                .btn.danger:hover { 
                                  background: #dc2626; 
                                }
                                iframe { 
                                  width: 100%; 
                                  height: calc(100vh - 70px); 
                                  border: none; 
                                  background: white;
                                }
                                .status {
                                  font-size: 14px;
                                  opacity: 0.9;
                                }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div>
                                  <h3 class="title">🌐 Visualizador PDF Completo</h3>
                                  <div class="status">${
                                    title || "Documento PDF"
                                  }</div>
                                </div>
                                <div class="controls">
                                  <button class="btn" onclick="document.getElementById('pdf').contentWindow.print()" title="Imprimir documento">
                                    �️ Imprimir
                                  </button>
                                  <button class="btn" onclick="window.location.href='${imageUrl}'" title="Descargar archivo">
                                    💾 Descargar
                                  </button>
                                  <button class="btn" onclick="window.location.reload()" title="Recargar documento">
                                    🔄 Recargar
                                  </button>
                                  <button class="btn danger" onclick="window.close()" title="Cerrar ventana">
                                    ❌ Cerrar
                                  </button>
                                </div>
                              </div>
                              <iframe 
                                id="pdf" 
                                src="${imageUrl}" 
                                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
                                title="PDF Viewer"
                              ></iframe>
                              <script>
                                // Mejorar la experiencia del usuario
                                document.addEventListener('DOMContentLoaded', function() {
                                  console.log('📄 PDF Viewer cargado exitosamente');
                                });
                                
                                // Atajos de teclado
                                document.addEventListener('keydown', function(e) {
                                  if (e.ctrlKey && e.key === 'p') {
                                    e.preventDefault();
                                    document.getElementById('pdf').contentWindow.print();
                                  }
                                  if (e.key === 'Escape') {
                                    window.close();
                                  }
                                });
                              </script>
                            </body>
                          </html>
                        `);
                        newWindow.document.close();
                      }
                    }}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
                    title="Abrir en navegador completo con todas las funciones nativas"
                  >
                    🌐 Navegador Completo
                  </button>
                </div>
                <button
                  onClick={() => window.open(imageUrl, "_blank")}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Abrir en nueva ventana
                </button>
              </div>
              <iframe
                id="pdf-iframe-modal"
                src={`${imageUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH&zoom=150`}
                title="Voucher PDF"
                className="w-full flex-1 border-0 rounded-b"
                style={{
                  minHeight: "700px",
                  height: "80vh",
                }}
                onLoad={(e) => {
                  // Intentar habilitar controles de zoom
                  try {
                    e.target.contentWindow.document.body.style.overflow =
                      "auto";
                  } catch (err) {
                    console.log("No se pudo acceder al iframe del PDF");
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center overflow-auto">
              <img
                src={imageUrl}
                alt="Voucher de depósito"
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VoucherModal;
