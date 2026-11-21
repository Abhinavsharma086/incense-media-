export const formatEventDate = (dateStr: string): string => {
    if (!dateStr) return "";

    return new Date(dateStr).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
};

export const formatTime = (timeStr: string): string => {
    if (!timeStr) return "";
    const date = new Date(`1970-01-01T${timeStr}`);

    return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

export const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

export const formatDateAndTime = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const dateStr_formatted = date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const timeStr_formatted = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
    return `${dateStr_formatted} | ${timeStr_formatted}`;
};