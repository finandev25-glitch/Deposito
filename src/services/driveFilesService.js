import { apiDelete, apiGet, apiPost, apiPut } from "./backendApi.js";

async function wrapRequest(requestFn) {
  try {
    const data = await requestFn();
    return { success: true, data: data?.data ?? data ?? null };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
}

export const driveFilesService = {
  async insertFile(fileData) {
    return wrapRequest(() =>
      apiPost("/drive-files", {
        file_url: fileData.file_url,
        deposito_id: fileData.deposito_id || null,
      })
    );
  },

  async getUnlinkedFiles() {
    return wrapRequest(() => apiGet("/drive-files/unlinked"));
  },

  async linkFileToDeposit(fileId, depositoId) {
    return wrapRequest(() =>
      apiPut(`/drive-files/${fileId}/link`, {
        deposito_id: depositoId,
      })
    );
  },

  async unlinkFile(fileId) {
    return wrapRequest(() => apiPut(`/drive-files/${fileId}/unlink`, {}));
  },

  async getFilesByDeposit(depositoId) {
    return wrapRequest(() => apiGet(`/drive-files/deposit/${depositoId}`));
  },

  async searchFiles(searchTerm) {
    const term = (searchTerm || "").trim();
    if (!term) {
      return { success: true, data: [] };
    }

    return wrapRequest(() => apiGet(`/drive-files/search?term=${encodeURIComponent(term)}`));
  },

  async deleteFile(fileId) {
    return wrapRequest(() => apiDelete(`/drive-files/${fileId}`));
  },
};

export default driveFilesService;
