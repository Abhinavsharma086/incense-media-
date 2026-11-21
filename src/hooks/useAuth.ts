import { getToken, isLoggedIn } from "@/lib/auth";
import { useEffect, useState } from "react";

export const useAuth = () => {
    const [authenticated, setAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        setAuthenticated(isLoggedIn());
    }, []);

    return { authenticated, token: getToken() };
};
