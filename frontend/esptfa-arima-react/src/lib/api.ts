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
let refreshSubscribers: ((err?: any) => void)[] = [];

const subscribeTokenRefresh = (cb: (err?: any) => void) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (err?: any) => {
    refreshSubscribers.forEach((cb) => cb(err));
    refreshSubscribers = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // Don't try to refresh if the request failed was for login or logout
        if (originalRequest?.url?.includes("/login/") || originalRequest?.url?.includes("/logout/")) {
            throw error;
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            // Already on login/register page? Don't bother refreshing or redirecting.
            if (globalThis.location.pathname === "/login" || globalThis.location.pathname === "/register") {
                throw error;
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    subscribeTokenRefresh((err?: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(api(originalRequest));
                        }
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Use a fresh axios instance to avoid interceptor recursion
                await axios.post(`${API_URL}/token/refresh/`, {}, { withCredentials: true });
                onRefreshed();
                isRefreshing = false;
                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                onRefreshed(refreshError);
                
                // Avoid hard window.location.replace if we're already trying to get to a public area
                if (globalThis.location.pathname !== "/login" && globalThis.location.pathname !== "/register") {
                    globalThis.location.replace("/login");
                }
                throw refreshError;
            }
        }

        throw error;
    }
);

export default api;
