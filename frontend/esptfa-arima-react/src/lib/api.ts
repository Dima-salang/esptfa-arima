import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
};

// Response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((token: string) => {
                        originalRequest.headers["Authorization"] = `Bearer ${token}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem("refresh");
            if (!refreshToken) {
                isRefreshing = false;
                localStorage.removeItem("access");
                globalThis.location.href = "/login";
                throw error;
            }

            try {
                const response = await axios.post(`${API_URL}/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access, refresh: newRefresh } = response.data;

                localStorage.setItem("access", access);
                if (newRefresh) {
                    localStorage.setItem("refresh", newRefresh);
                }

                api.defaults.headers.common["Authorization"] = `Bearer ${access}`;
                onRefreshed(access);
                isRefreshing = false;

                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                globalThis.location.href = "/login";
                throw refreshError;
            }
        }

        throw error;
    }
);

export default api;
