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
      const filename = urlPath.substring(urlPath.lastIndexOf("/") + 1) || "voucher";
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Error al descargar el archivo:", error);
      window.open(imageUrl, "_blank");
      alert("No se pudo descargar el archivo directamente. Se abrirá en una nueva pestaña para que puedas guardarlo manualmente.");
    }
  };

  const isPdf = imageUrl.toLowerCase().includes(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="relative flex w-full max-w-6xl max-h-[95vh] flex-col rounded-lg bg-white p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -right-4 -top-4 z-10 flex space-x-2">
          <button
            onClick={handleDownload}
            className="rounded-full bg-white p-1.5 shadow-lg transition-colors hover:bg-gray-200"
            aria-label="Descargar"
            title="Descargar"
          >
            <Download className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-white p-1.5 shadow-lg transition-colors hover:bg-gray-200"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6 text-gray-700" />
          </button>
        </div>

        <div className="h-full w-full flex-1 min-h-0">
          {isPdf ? (
            <div className="flex h-full w-full flex-col">
              <div className="flex items-center justify-between rounded-t bg-gray-100 p-3 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Controles PDF:</span>
                  <button
                    onClick={() => {
                      const newWindow = window.open(
                        "",
                        "pdf-viewer-full",
                        "width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=yes",
                      );
                      if (newWindow) {
                        newWindow.document.write(`
                          <html>
                            <head>
                              <title>Visualizador PDF Completo</title>
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
                                  <h3 class="title">Visualizador PDF Completo</h3>
                                  <div class="status">Documento PDF</div>
                                </div>
                                <div class="controls">
                                  <button class="btn" onclick="document.getElementById('pdf').contentWindow.print()" title="Imprimir documento">
                                    Imprimir
                                  </button>
                                  <button class="btn" onclick="window.location.href='${imageUrl}'" title="Descargar archivo">
                                    Descargar
                                  </button>
                                  <button class="btn" onclick="window.location.reload()" title="Recargar documento">
                                    Recargar
                                  </button>
                                  <button class="btn danger" onclick="window.close()" title="Cerrar ventana">
                                    Cerrar
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
                                document.addEventListener('DOMContentLoaded', function() {
                                  console.log('PDF Viewer cargado exitosamente');
                                });

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
                    className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-purple-700"
                    title="Abrir en navegador completo con todas las funciones nativas"
                  >
                    Navegador Completo
                  </button>
                </div>
                <button
                  onClick={() => window.open(imageUrl, "_blank")}
                  className="rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                >
                  Abrir en nueva ventana
                </button>
              </div>
              <iframe
                id="pdf-iframe-modal"
                src={`${imageUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH&zoom=150`}
                title="Voucher PDF"
                className="w-full flex-1 rounded-b border-0"
                style={{
                  minHeight: "700px",
                  height: "80vh",
                }}
                onLoad={(e) => {
                  try {
                    e.target.contentWindow.document.body.style.overflow = "auto";
                  } catch (err) {
                    console.log("No se pudo acceder al iframe del PDF");
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center overflow-auto">
              <img
                src={imageUrl}
                alt="Voucher de depósito"
                className="max-h-full max-w-full rounded object-contain"
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VoucherModal;
