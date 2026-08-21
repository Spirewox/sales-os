import axios, { AxiosError, isAxiosError } from "axios";

const base_url = process.env.NEXT_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 8_000;

const authConfig = (withAuth?: boolean) => ({
  withCredentials: withAuth,
  timeout: REQUEST_TIMEOUT_MS,
});

/** Prefer Nest `message` (string or validation array); fall back for timeouts/network. */
function axiosErrorMessage(error: AxiosError, fallback = 'An error occurred'): string {
  const data = error.response?.data as { message?: string | string[] } | string | undefined;
  if (typeof data === 'string' && data.trim()) return data;
  const raw =
    data && typeof data === 'object' && 'message' in data ? data.message : undefined;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = String(raw[0] ?? '').trim();
    if (first) {
      return first
        .split('_')
        .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
        .join(' ');
    }
  }
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message)) {
    return 'Request timed out. Try again with a smaller file or a stronger connection.';
  }
  if (!error.response && error.message) return error.message;
  return fallback;
}

export const axiosGet = async (endpoint: string, withAuth?: boolean) => {
  try {
    const res = await axios.get(`${base_url}${endpoint}`, authConfig(withAuth));
    return res.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(axiosErrorMessage(error, error.message));
    }
    throw error;
  }
};

export const axiosPost = async (
  endpoint: string,
  data?: object,
  withAuth?: boolean,
  timeoutMs?: number,
) => {
  try {
    const res = await axios.post(`${base_url}${endpoint}`, data, {
      ...authConfig(withAuth),
      ...(timeoutMs != null ? { timeout: timeoutMs } : {}),
    });
    return res.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(axiosErrorMessage(error));
    }
    throw error;
  }
};

export const axiosPatch = async (
  endpoint: string,
  data?: object,
  withAuth?: boolean,
) => {
  try {
    const res = await axios.patch(`${base_url}${endpoint}`, data, authConfig(withAuth));
    return res.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(axiosErrorMessage(error));
    }
    throw error;
  }
};

export const axiosPut = async (
  endpoint: string,
  data?: object,
  withAuth?: boolean,
) => {
  try {
    const res = await axios.put(`${base_url}${endpoint}`, data, authConfig(withAuth));
    return res.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(axiosErrorMessage(error));
    }
    throw error;
  }
};

export const axiosDelete = async (endpoint: string, withAuth?: boolean) => {
  try {
    const res = await axios.delete(`${base_url}${endpoint}`, authConfig(withAuth));
    return res.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(axiosErrorMessage(error));
    }
    throw error;
  }
};

export const axiosGetBlob = async (endpoint: string, withAuth?: boolean) => {
  try {
    const res = await axios.get(`${base_url}${endpoint}`, {
      ...authConfig(withAuth),
      responseType: 'arraybuffer',
    });
    return res.data as ArrayBuffer;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(axiosErrorMessage(error));
    }
    throw error;
  }
};

export const axiosPostForm = async (
  endpoint: string,
  formData: FormData,
  withAuth?: boolean,
  timeoutMs?: number,
) => {
  try {
    const res = await axios.post(`${base_url}${endpoint}`, formData, {
      ...authConfig(withAuth),
      ...(timeoutMs != null ? { timeout: timeoutMs } : {}),
    });
    return res.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new Error(axiosErrorMessage(error));
    }
    throw error;
  }
};
