const BASE_URL = "http://localhost:8000"

export interface User {
    id: number
    username: string
    email: string
    created_at?: string
}

export async function fetchUsers(): Promise<User[]> {
    const token = localStorage.getItem("access_token")
    if (!token) throw new Error("No token found")

    const res = await fetch(`${BASE_URL}/users/`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to fetch users: ${res.status} ${text}`)
    }

    return res.json()
}
