import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
});

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

const subscribeTokenRefresh = (cb: () => void) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = () => {
    refreshSubscribers.forEach((cb) => cb());
    refreshSubscribers = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        if (originalRequest?.url?.includes("/logout/")) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh(() => {
                        resolve(api(originalRequest));
                    });
                });
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
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
