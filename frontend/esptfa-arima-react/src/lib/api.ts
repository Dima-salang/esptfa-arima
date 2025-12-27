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
        console.log(config);
        return config;
    },
    (error) => {
        console.log(error);
        return Promise.reject(error);
    }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and we haven't retried this specific request yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem("refresh");
                
                // Attempt to get a new access token
                const response = await axios.post(`${API_URL}/token/refresh/`, {
                    refresh: refreshToken,
                });

                const { access } = response.data;

                // Update storage and headers
                localStorage.setItem("access", access);
                api.defaults.headers.common["Authorization"] = `Bearer ${access}`;
                originalRequest.headers["Authorization"] = `Bearer ${access}`;

                // Retry the original request with the new token
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, the refresh token is likely expired too
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                window.location.href = "/login"; 
                throw refreshError;
            }
        }

        throw error;
    }
);

export default api;
