// src/api/messages.ts
const BASE_URL = "http://localhost:8000"

function getToken(): string | null {
    return localStorage.getItem("access_token")
}

// === Типы данных ===
export interface Message {
    id: number
    sender_id: number
    receiver_id: number
    text: string | null
    files: string[]
    created_at: string
}

export interface CreateMessageParams {
    receiver_id: number
    text: string
    files?: File[]
}

export interface EditMessageParams {
    text?: string
    files?: File[]
}

// === API функции ===

export async function fetchMessagesWith(userId: number): Promise<Message[]> {
    const token = getToken()
    if (!token) throw new Error("No token found")

    const res = await fetch(`${BASE_URL}/messages/${userId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    })

    if (res.status === 401) {
        window.location.href = "/auth"
        throw new Error("Unauthorized")
    }

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to fetch messages: ${res.status} ${text}`)
    }

    return res.json()
}

export async function createMessageApi({
    receiver_id,
    text,
    files = [],
}: CreateMessageParams): Promise<Message> {
    const token = getToken()
    if (!token) throw new Error("No token found")

    const form = new FormData()
    form.append("receiver_id", String(receiver_id))
    form.append("text", text)
    files.forEach((f) => form.append("files", f))

    const res = await fetch(`${BASE_URL}/messages/`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: form,
    })

    if (!res.ok) throw new Error(`Failed to send message: ${res.statusText}`)
    return res.json()
}

export async function editMessageApi(
    message_id: number,
    data: EditMessageParams = {}
): Promise<Message> {
    const { text, files = [] } = data
    const token = getToken()
    if (!token) throw new Error("No token found")

    const form = new FormData()
    if (text !== undefined) form.append("text", text)
    if (files.length > 0) {
        files.forEach((f) => form.append("files", f))
    }

    const res = await fetch(`${BASE_URL}/messages/${message_id}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: form,
    })

    if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Failed to edit message: ${res.status} ${txt}`)
    }
    return res.json()
}

export async function deleteMessageApi(message_id: number): Promise<{ success: boolean }> {
    const token = getToken()
    if (!token) throw new Error("No token found")

    const res = await fetch(`${BASE_URL}/messages/${message_id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    if (!res.ok) throw new Error("Failed to delete message")
    return res.json()
}
