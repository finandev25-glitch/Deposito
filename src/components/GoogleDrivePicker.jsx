import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Search, Loader2 } from 'lucide-react';
import { gapi } from 'gapi-script';

const GoogleDrivePicker = ({ onClose, onFileSelect }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

  useEffect(() => {
    function start() {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        scope: SCOPES,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      }).then(() => {
        const authInstance = gapi.auth2.getAuthInstance();
        setIsSignedIn(authInstance.isSignedIn.get());
        authInstance.isSignedIn.listen(updateSigninStatus);
        setIsLoading(false);
      }).catch(err => {
        console.error("Error initializing GAPI client:", err);
        setIsLoading(false);
        alert("Error al inicializar la API de Google. Revisa la configuración de tus credenciales.");
      });
    }
    gapi.load('client:auth2', start);
  }, []);

  const updateSigninStatus = (signedIn) => {
    setIsSignedIn(signedIn);
    if (signedIn) {
      handleSearch();
    }
  };

  const handleAuthClick = () => {
    gapi.auth2.getAuthInstance().signIn();
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!isSignedIn) return;
    setIsSearching(true);
    try {
      const response = await gapi.client.drive.files.list({
        pageSize: 20,
        fields: 'nextPageToken, files(id, name, webViewLink, iconLink, mimeType)',
        q: `name contains '${searchTerm}' and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='application/pdf') and trashed=false`,
      });
      setFiles(response.result.files || []);
    } catch (error) {
      console.error("Error searching files in Google Drive:", error);
      alert('Error al buscar archivos. Asegúrate de haber concedido los permisos necesarios.');
    }
    setIsSearching(false);
  };

  const handleFileClick = (file) => {
    onFileSelect(file.webViewLink);
    onClose();
  };

  const content = (
    <div className="fixed inset-0 bg-black/60 z-[9998] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="bg-white rounded-xl w-full max-w-xl h-[70vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Seleccionar desde Google Drive</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4 flex-shrink-0">
          {!isSignedIn ? (
            <div className="text-center">
              <p className="mb-4 text-sm">Debes iniciar sesión con Google para buscar en tu Drive.</p>
              <button 
                onClick={handleAuthClick} 
                disabled={isLoading}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center justify-center mx-auto disabled:bg-blue-400 text-sm"
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                Iniciar Sesión con Google
              </button>
            </div>
          ) : (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar imágenes y PDFs en Drive..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button type="submit" disabled={isSearching} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center disabled:bg-blue-400">
                {isSearching ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
              </button>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {isSearching && <div className="text-center p-8"><Loader2 className="animate-spin mx-auto text-blue-600" size={22} /></div>}
          {!isSearching && files.length > 0 && (
            <ul className="space-y-1">
              {files.map(file => (
                <li key={file.id}>
                  <button 
                    onClick={() => handleFileClick(file)}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <img src={file.iconLink} alt="file icon" className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!isSearching && isSignedIn && files.length === 0 && (
             <div className="text-center text-gray-500 pt-8 text-sm">
                <p>No se encontraron archivos o no has realizado una búsqueda.</p>
             </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
};

export default GoogleDrivePicker;
