import { apiGet, apiPost, apiPut, apiDelete } from "./backendApi.js";

async function requestYCloud(path, body, method = "POST") {
  const response =
    method === "GET"
      ? await apiGet(path)
      : method === "PUT"
        ? await apiPut(path, body)
        : method === "DELETE"
          ? await apiDelete(path)
          : await apiPost(path, body);

  return response;
}

const yCloudService = {
  async listConfigs() {
    const response = await apiGet("/ycloud/configs");
    return response.data || [];
  },

  async listActiveConfigs() {
    const response = await apiGet("/ycloud/configs/active");
    return response.data || [];
  },

  async createConfig(configData) {
    return requestYCloud("/ycloud/configs", configData, "POST");
  },

  async updateConfig(configId, configData) {
    return requestYCloud(`/ycloud/configs/${configId}`, configData, "PUT");
  },

  async deleteConfig(configId) {
    return requestYCloud(`/ycloud/configs/${configId}`, null, "DELETE");
  },

  async testConnection(configId) {
    return requestYCloud("/ycloud/test-connection", { configId }, "POST");
  },

  async sendTextMessage(messageData) {
    return requestYCloud("/ycloud/send", {
      ...messageData,
      type: "text",
      text: {
        body: messageData.text,
        previewUrl: messageData.previewUrl || false,
      },
    });
  },

  async sendTemplateMessage(messageData) {
    return requestYCloud("/ycloud/send", {
      ...messageData,
      type: "template",
      template: {
        name: messageData.template.name,
        language: messageData.template.language || "es",
        components: messageData.template.components || [],
      },
    });
  },

  async sendImageMessage(messageData) {
    return requestYCloud("/ycloud/send", {
      ...messageData,
      type: "image",
      image: {
        link: messageData.imageUrl,
        caption: messageData.caption,
      },
    });
  },

  async sendDocumentMessage(messageData) {
    return requestYCloud("/ycloud/send", {
      ...messageData,
      type: "document",
      document: {
        link: messageData.documentUrl,
        filename: messageData.filename,
        caption: messageData.caption,
      },
    });
  },

  async sendMessage(messageData) {
    return requestYCloud("/ycloud/send", messageData);
  },

  async sendTestMessage(configId, toNumber) {
    return requestYCloud("/ycloud/test", { configId, to: toNumber }, "POST");
  },

  async getConversationHistory(params) {
    return requestYCloud("/ycloud/conversation", params, "POST");
  },
};

export default yCloudService;
