import axios from "axios"; 

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api"; 

interface RetryConfig {
    maxRetries: number;
    retryDelay: number;
    retryCount: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryCount: 0,
};

const shouldRetry = (error: any): boolean => {
    if (!error) return false;

    const isNetworkError = !error.response && error.code !== 'ECONNABORTED';
    const isServerError = error.response?.status && error.response.status >= 500 && error.response.status < 600;
    const isRateLimit = error.response?.status === 429;
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

    return isNetworkError || isServerError || isRateLimit || isTimeout;
};

const isClientError = (status: number | undefined): boolean => {
    return status !== undefined && status >= 400 && status < 500;
};

const getRetryDelay = (retryCount: number, baseDelay: number): number => {
    return Math.min(baseDelay * Math.pow(2, retryCount), 30000);
};

type ExtendedAxiosRequestConfig = any & {
    _retry?: boolean;
    _retryConfig?: RetryConfig;
};

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = []; 

const subscribeTokenRefresh = (cb: () => void) => {
    refreshSubscribers.push(cb);
    void subscribeTokenRefresh(cb);
}; 

const onRefreshed = () => {
    refreshSubscribers.forEach((cb) => cb());
    refreshSubscribers = [];
}; 

api.interceptors.request.use(
    (config) => {
        return {
            ...config,
            _retry: false,
            _retryConfig: DEFAULT_RETRY_CONFIG,
        };
    }
);

api.interceptors.response.use(
    (response) => {
        const config = response.config as ExtendedAxiosRequestConfig;
        if (config._retryConfig) {
            config._retryConfig.retryCount = 0;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config as ExtendedAxiosRequestConfig;
        const retryConfig = originalRequest._retryConfig as RetryConfig;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await axios.post(`${API_URL}/token/refresh/`, {}, { withCredentials: true });

                onRefreshed();
                isRefreshing = false;

                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                globalThis.location.href = "/login";
                throw refreshError;
            }
        } else if (shouldRetry(error) && !originalRequest._retry && retryConfig && !isClientError(error.response?.status)) {
            retryConfig.retryCount = (retryConfig.retryCount || 0) + 1;

            if (retryConfig.retryCount > retryConfig.maxRetries) {
                throw error;
            }

            const delay = getRetryDelay(retryConfig.retryCount, retryConfig.retryDelay);

            await new Promise((resolve) => setTimeout(resolve, delay));

            const modifiedRequest = { ...originalRequest };
            delete modifiedRequest._retry;
            delete modifiedRequest._retryConfig;
            modifiedRequest._retry = true;
            modifiedRequest._retryConfig = retryConfig;

            return api(modifiedRequest);
        }

        throw error;
    }
); 

export default api;
