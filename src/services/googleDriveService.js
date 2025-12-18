import { gapi } from 'gapi-script';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

/**
 * Inicializa el cliente de Google API
 */
export const initGoogleDrive = async () => {
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          scope: SCOPES,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        resolve(gapi.auth2.getAuthInstance());
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Verifica si el usuario está autenticado
 */
export const isSignedIn = () => {
  const authInstance = gapi.auth2.getAuthInstance();
  return authInstance && authInstance.isSignedIn.get();
};

/**
 * Inicia sesión con Google
 */
export const signIn = async () => {
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    await authInstance.signIn();
    return true;
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return false;
  }
};

/**
 * Sube un archivo a Google Drive
 * @param {File} file - Archivo a subir
 * @param {string} folderName - Nombre de la carpeta (opcional)
 * @returns {Promise<{success: boolean, fileId: string, webViewLink: string, message: string}>}
 */
export const uploadToGoogleDrive = async (file, folderName = 'Vouchers') => {
  try {
    console.log('📤 Iniciando subida a Google Drive...', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folderName
    });

    // Verificar autenticación
    if (!isSignedIn()) {
      console.warn('⚠️ Usuario no autenticado, intentando login...');
      const signedIn = await signIn();
      if (!signedIn) {
        return {
          success: false,
          message: 'No se pudo autenticar con Google Drive'
        };
      }
    }

    // 1. Buscar o crear carpeta
    let folderId = await findOrCreateFolder(folderName);
    console.log('📁 Carpeta:', folderId);

    // 2. Crear metadata del archivo
    const metadata = {
      name: `${Date.now()}_${file.name}`,
      parents: [folderId],
      mimeType: file.type
    };

    // 3. Leer archivo como base64
    const fileContent = await readFileAsBase64(file);

    // 4. Crear form data
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + file.type + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      fileContent +
      close_delim;

    // 5. Subir archivo
    console.log('⬆️ Subiendo archivo...');
    const response = await gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: {
        uploadType: 'multipart',
        fields: 'id,name,webViewLink,webContentLink'
      },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: multipartRequestBody
    });

    console.log('✅ Archivo subido exitosamente:', response.result);

    // 6. Hacer el archivo público (opcional)
    try {
      await gapi.client.drive.permissions.create({
        fileId: response.result.id,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });
      console.log('🌐 Archivo configurado como público');
    } catch (permError) {
      console.warn('⚠️ No se pudo hacer público el archivo:', permError);
    }

    return {
      success: true,
      fileId: response.result.id,
      webViewLink: response.result.webViewLink,
      webContentLink: response.result.webContentLink,
      message: 'Archivo subido exitosamente a Google Drive'
    };

  } catch (error) {
    console.error('❌ Error subiendo archivo a Google Drive:', error);
    return {
      success: false,
      message: error.message || 'Error desconocido al subir archivo'
    };
  }
};

/**
 * Busca una carpeta por nombre, si no existe la crea
 */
const findOrCreateFolder = async (folderName) => {
  try {
    // Buscar carpeta existente
    const response = await gapi.client.drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.result.files && response.result.files.length > 0) {
      console.log('📁 Carpeta encontrada:', response.result.files[0].id);
      return response.result.files[0].id;
    }

    // Crear carpeta si no existe
    console.log('📁 Creando carpeta:', folderName);
    const createResponse = await gapi.client.drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    console.log('✅ Carpeta creada:', createResponse.result.id);
    return createResponse.result.id;
  } catch (error) {
    console.error('❌ Error buscando/creando carpeta:', error);
    // Retornar null para subir a la raíz si falla
    return null;
  }
};

/**
 * Lee un archivo como base64
 */
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default {
  initGoogleDrive,
  isSignedIn,
  signIn,
  uploadToGoogleDrive
};
