// src/api/messages.ts
const WS_URL = "ws://localhost:8000/messages/ws/chat"

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

// === WebSocket клиент ===
let socket: WebSocket | null = null
let listeners: ((msg: any) => void)[] = []

export function connectMessagesWS(onMessage: (msg: any) => void) {
    const token = getToken()
    if (!token) throw new Error("No token found")

    socket = new WebSocket(`${WS_URL}?token=${token}`)

    socket.onopen = () => {
        console.log("✅ WebSocket connected")
    }

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        listeners.forEach((fn) => fn(data))
    }

    socket.onclose = () => {
        console.log("❌ WebSocket closed")
        socket = null
    }

    // подписка конкретного компонента
    listeners.push(onMessage)

    return () => {
        listeners = listeners.filter((fn) => fn !== onMessage)
    }
}

export function fileToBase64(file: File): Promise<{ name: string; content: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1]
            resolve({ name: file.name, content: base64 })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

function sendWS(payload: any) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket not connected")
    }
    socket.send(JSON.stringify(payload))
}

// === API функции через WebSocket ===

export function fetchMessagesWith(userId: number) {
    sendWS({ action: "history", other_user_id: userId })
}

export async function createMessageApi({ receiver_id, text, files }: CreateMessageParams) {
    const filesData = files ? await Promise.all(files.map(fileToBase64)) : []
    sendWS({ action: "send", receiver_id, text, files: filesData })
}

export function editMessageApi(message_id: number, data: EditMessageParams) {
    sendWS({ action: "edit", id: message_id, ...data })
}

export function deleteMessageApi(message_id: number) {
    sendWS({ action: "delete", id: message_id })
}