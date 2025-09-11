// src/api/auth.ts
const BASE_URL = "http://localhost:8000"

// === Типы ===
export interface AuthResponse {
    access_token: string
    token_type: string
}

export interface LoginParams {
    username: string
    password: string
}

export interface RegisterParams {
    username: string
    email: string
    password: string
}

export interface UserProfile {
    id: number
    username: string
    email: string
    created_at?: string
}

// === API ===
export async function login({ username, password }: LoginParams): Promise<AuthResponse> {
    const form = new URLSearchParams()
    form.append("username", username)
    form.append("password", password)

    const res = await fetch(`${BASE_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
    })

    if (!res.ok) throw new Error("Login failed")

    const data: AuthResponse = await res.json()
    localStorage.setItem("access_token", data.access_token)
    return data
}

export async function register({ username, email, password }: RegisterParams): Promise<UserProfile> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
    })

    if (!res.ok) throw new Error("Registration failed")

    return res.json()
}

export async function logout(): Promise<void> {
    localStorage.removeItem("access_token")
}

export async function fetchProfile(): Promise<UserProfile> {
    const token = localStorage.getItem("access_token")
    if (!token) throw new Error("No token found")

    const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    })

    if (!res.ok) throw new Error(`Fetching profile failed: ${res.status}`)
    return res.json()
}
