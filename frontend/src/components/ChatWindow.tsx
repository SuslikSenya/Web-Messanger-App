// src/components/ChatWindow.tsx
import React, { useEffect, useRef, useState } from "react"
import { fileToBase64 } from "../api/messages"

const BASE_URL = "http://localhost:8000"
const WS_URL = "ws://localhost:8000/messages/ws"

interface User {
    id: number
    username: string
    email?: string
}

interface Message {
    id: number
    sender_id: number
    receiver_id: number
    text?: string | null
    files?: string[]
    created_at?: string | null
}

interface ChatWindowProps {
    user: User | null
    profile: User | null
}

export default function ChatWindow({ user, profile }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState<string>("")
    const [localFiles, setLocalFiles] = useState<File[]>([])
    const [sending, setSending] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const [editingId, setEditingId] = useState<number | null>(null)
    const [editingText, setEditingText] = useState<string>("")
    const [editingFiles, setEditingFiles] = useState<File[]>([])

    const scrollRef = useRef<HTMLDivElement | null>(null)
    const scrollOnNextRenderRef = useRef<boolean>(false)
    const wsRef = useRef<WebSocket | null>(null)

    const otherId = user?.id
    const myId = profile?.id

    const sendWS = (payload: any) => {
        if (!wsRef.current) return
        if (wsRef.current.readyState !== WebSocket.OPEN) {
            console.warn("WS not ready yet", payload)
            return
        }
        wsRef.current.send(JSON.stringify(payload))
    }

    useEffect(() => {
        if (!myId) return
        const token = localStorage.getItem("access_token")
        const ws = new WebSocket(`${WS_URL}/chat?token=${token}`)
        wsRef.current = ws

        ws.onopen = () => {
            // console.log("✅ WebSocket connected")
            if (otherId) sendWS({ action: "history", other_user_id: otherId })
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                // console.log("WS received:", data)

                if (data.type === "history") {
                    setMessages(data.messages)
                } else if (data.type === "message") {
                    setMessages((prev) => [...prev, data.message])
                } else if (data.type === "edit") {
                    setMessages((prev) =>
                        prev.map((m) => (m.id == data.message.id ? data.message : m))
                    )
                } else if (data.type === "delete") {
                    setMessages((prev) =>
                        prev.filter((m) => m.id != data.message.id)
                    )
                }

                scrollOnNextRenderRef.current = true
            } catch (err) {
                console.error("WS message error:", err)
            }
        }

        ws.onerror = (e) => {
            // console.error("WebSocket error:", e)
            setError("WebSocket error")
        }

        ws.onclose = () => {
            // console.log("❌ WebSocket closed")
        }

        return () => {
            ws.close()
            wsRef.current = null
        }
    }, [myId, otherId])

    useEffect(() => {
        if (!scrollOnNextRenderRef.current) return
        requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            scrollOnNextRenderRef.current = false
        })
    }, [messages])

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files || []) as File[]
        setLocalFiles((prev) => [...prev, ...picked])
        e.target.value = ""
    }
    const removeLocalFile = (idx: number) => setLocalFiles((prev) => prev.filter((_, i) => i !== idx))
    const onEditFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files || []) as File[]
        setEditingFiles((prev) => [...prev, ...picked])
        e.target.value = ""
    }

    const handleSend = async () => {
        const txt = text.trim()
        if (!txt && localFiles.length === 0) return
        if (!otherId || !myId) return

        setSending(true)
        try {
            // преобразуем файлы в Base64
            const filesData = await Promise.all(localFiles.map(fileToBase64))

            sendWS({
                action: "send",
                receiver_id: otherId,
                text: txt,
                files: filesData
            })

            setText("")
            setLocalFiles([])
            scrollOnNextRenderRef.current = true
        } catch (err: any) {
            console.error("send error", err)
            setError("Failed to send")
        } finally {
            setSending(false)
        }
    }


    const startEdit = (msg: Message) => {
        setEditingId(msg.id)
        setEditingText(msg.text || "")
        setEditingFiles([])
    }
    const cancelEdit = () => {
        setEditingId(null)
        setEditingText("")
        setEditingFiles([])
    }
    const saveEdit = (msgId: number) => {
        sendWS({
            action: "edit",
            id: msgId,
            text: editingText,
            files: editingFiles.map((f) => f.name),
        })
        cancelEdit()
    }

    const handleDelete = (msgId: number) => {
        if (!window.confirm("Delete this message?")) return
        sendWS({ action: "delete", id: msgId })
    }

    if (!user) return <div className="flex-1 flex items-center justify-center text-gray-400">Select a user to start chat</div>

    const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp)$/i.test(url)

    return (
        <div className="flex-1 flex flex-col">
            <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div>
                    <div className="text-lg font-semibold">{user.username}</div>
                    <div className="text-sm text-gray-400">chat with {profile?.username}</div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500">No messages yet. Say hi 👋</div>
                ) : (
                    messages.map((msg) => {
                        const mine = msg.sender_id === myId
                        const isEditing = editingId === msg.id

                        return (
                            <div
                                key={msg.id}
                                className={`max-w-md p-3 rounded-lg break-words flex flex-col ${mine ? "bg-blue-600 self-end text-white" : "bg-gray-700 self-start text-white"}`}
                                style={{ alignSelf: mine ? "flex-end" : "flex-start" }}
                            >
                                {isEditing ? (
                                    <>
                                        <input
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            className="bg-gray-800 text-white rounded p-2 mb-2 w-full"
                                        />
                                        <input type="file" multiple onChange={onEditFilesChange} className="text-sm mb-2" />
                                        {editingFiles.length > 0 && (
                                            <div className="flex gap-2 items-center text-xs text-gray-200 mb-2">
                                                {editingFiles.map((f, i) => (
                                                    <div key={i} className="bg-gray-800 px-2 py-1 rounded">{f.name}</div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {msg.text && <div>{msg.text}</div>}
                                        {msg.files?.map((f, idx) => {
                                            const url = f.startsWith("http") ? f : `${BASE_URL}${f}`
                                            // console.log("Image URL:", url)
                                            return isImageUrl(url) ? (
                                                <img key={idx} src={url} alt="" className="max-w-xs rounded mt-2" />
                                            ) : (
                                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-blue-200 underline block mt-2">{url.split("/").pop()}</a>
                                            )
                                        })}
                                    </>
                                )}

                                <div className="flex justify-between items-center mt-2 text-xs text-gray-200 opacity-80">
                                    <div>{msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}</div>
                                    {mine && (
                                        <div className="flex gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={() => saveEdit(msg.id)} className="text-green-400 hover:underline">Save</button>
                                                    <button onClick={cancelEdit} className="text-gray-400 hover:underline">Cancel</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(msg)} className="text-yellow-400 hover:underline">Edit</button>
                                                    <button onClick={() => handleDelete(msg.id)} className="text-red-400 hover:underline">Delete</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="p-4 border-t border-gray-700 flex flex-col gap-2 flex-shrink-0">
                {localFiles.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                        {localFiles.map((f, i) => {
                            const preview = URL.createObjectURL(f)
                            const isImage = /\.(png|jpe?g|gif|webp)$/i.test(f.name)
                            return (
                                <div key={i} className="relative">
                                    {isImage ? (
                                        <img src={preview} alt={f.name} className="w-24 h-24 object-cover rounded" />
                                    ) : (
                                        <div className="w-24 h-24 flex items-center justify-center rounded bg-gray-700 text-sm p-2">{f.name}</div>
                                    )}
                                    <button
                                        onClick={() => {
                                            removeLocalFile(i)
                                            URL.revokeObjectURL(preview)
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-600 rounded-full px-2 text-white"
                                    >
                                        ×
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    {/* Styled file input with SVG */}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors">
                        <input type="file" multiple onChange={onFileChange} className="hidden" />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M4 12l8-8 8 8M12 4v12" />
                        </svg>
                        <span className="text-white font-medium">Attach</span>
                    </label>

                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={async (e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                scrollOnNextRenderRef.current = true
                                handleSend()
                            }
                        }}
                        className="flex-1 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none"
                    />

                    <button
                        onClick={handleSend}
                        disabled={sending}
                        className={`px-4 py-2 rounded-xl font-semibold ${sending ? "opacity-60 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                        {sending ? "Sending..." : "Send"}
                    </button>
                </div>
            </div>
        </div>
    )
}
