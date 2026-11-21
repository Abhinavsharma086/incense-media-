import { toast } from "sonner";
import { instance } from "./axiosInstance";

export const apiCall = async (method: string, url: string, data: any = null, config: any = {}) => {
    try {
        const isFormData = data instanceof FormData;

        // Build headers safely
        const finalHeaders = { ...config.headers };
        if (!isFormData && !finalHeaders['Content-Type']) {
            finalHeaders['Content-Type'] = 'application/json';
        }

        let response;
        if (method === "get" || method === "delete") {
            response = await (instance as any)[method](url, config);
        } else {
            response = await (instance as any)[method](url, data, {
                ...config,
                headers: finalHeaders,
            });
        }

        return { success: true, data: response.data };
    } catch (error: any) {
        console.warn("API Call Error:", error?.response?.data || error?.message || error);
        
        // Handle 401 only if explicitly expired real JWT, without wiping local settings
        if (error.response?.status === 401 && error.response?.data?.message === "jwt expired") {
            const token = localStorage.getItem("token");
            if (token && !token.startsWith("token-") && !token.startsWith("demo-")) {
                localStorage.removeItem("token");
                localStorage.removeItem("crm_token");
                localStorage.removeItem("user");
                localStorage.removeItem("role");
                window.location.href = "/login";
            }
        }

        const errors = error?.response?.data?.errors;
        const message = error?.response?.data?.message || error?.response?.data?.error;

        if (errors && Object.keys(errors).length > 0) {
            const firstKey = Object.keys(errors)[0];
            const firstErrorMessage = errors[firstKey][0];
            toast.error(firstErrorMessage);
        } else if (message) {
            toast.error(message);
        } else if (error.message && error.message !== "Network Error") {
            toast.error(error.message);
        }
        return { success: false, error: message || error.message };
    }
};