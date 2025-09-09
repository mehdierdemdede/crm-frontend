const BASE_URL = 'http://localhost:8080/api';

export const api = {
    post: async (url: string, data: any) => {
        const response = await fetch(`${BASE_URL}${url}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return response;
    },
};