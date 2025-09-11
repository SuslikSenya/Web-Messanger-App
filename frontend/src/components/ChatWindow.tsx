// src/components/ChatWindow.tsx
import React, { useEffect, useRef, useState } from "react"
import {
    fetchMessagesWith,
    createMessageApi,
    editMessageApi,
    deleteMessageApi,
} from "../api/messages"

const BASE_URL = "http://localhost:8000"

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
    user: User | null // other user (selected)
    profile: User | null // current user
}

export default function ChatWindow({ user, profile }: ChatWindowProps) {
    const [messages, setMessages] = useState < Message[] > ([])
    const [text, setText] = useState < string > ("")
    const [localFiles, setLocalFiles] = useState < File[] > ([])
    const [sending, setSending] = useState < boolean > (false)
    const [progress, setProgress] = useState < number > (0)
    const [loading, setLoading] = useState < boolean > (true)
    const [error, setError] = useState < string | null > (null)

    const [editingId, setEditingId] = useState < number | null > (null)
    const [editingText, setEditingText] = useState < string > ("")
    const [editingFiles, setEditingFiles] = useState < File[] > ([])

    const otherId = user?.id
    const myId = profile?.id
    const pollRef = useRef < ReturnType < typeof setInterval > | null > (null)
    const scrollRef = useRef < HTMLDivElement | null > (null)

    const scrollOnNextRenderRef = useRef < boolean > (false)

    const loadMessages = async () => {
        if (!otherId) {
            setLoading(false)
            return
        }
        try {
            const data = await fetchMessagesWith(otherId)
            setMessages(data || [])
            setError(null)
        } catch (err: any) {
            console.error("loadMessages:", err)
            setError(err?.message || "Failed to load messages")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        loadMessages()

        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(() => {
            loadMessages()
        }, 2000)

        return () => {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
        }
    }, [otherId])

    useEffect(() => {
        if (!scrollOnNextRenderRef.current) return

        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
            scrollOnNextRenderRef.current = false
        })
    }, [messages])

    // --- Sending new message ---
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files || []) as File[]
        setLocalFiles((prev) => [...prev, ...picked])
        e.target.value = ""
    }
    const removeLocalFile = (idx: number) => {
        setLocalFiles((prev) => prev.filter((_, i) => i !== idx))
    }

    const handleSend = async () => {
        const txt = text.trim()
        if (!txt && localFiles.length === 0) return
        if (!otherId) {
            alert("No recipient selected")
            return
        }

        setSending(true)
        setProgress(0)
        try {
            const created = await createMessageApi({
                receiver_id: otherId,
                text: txt,
                files: localFiles,
            })
            setMessages((prev) => [...prev, created])
            setText("")
            setLocalFiles([])
            setProgress(0)
            setError(null)
            scrollOnNextRenderRef.current = true
            return created
        } catch (err: any) {
            console.error("send error", err)
            setError(err?.message || "Failed to send message")
            alert("Ошибка отправки: " + (err?.message || ""))
            throw err
        } finally {
            setSending(false)
        }
    }

    // --- Editing ---
    const startEdit = (msg: Message) => {
        setEditingId(msg.id)
        setEditingText(msg.text || "")
        setEditingFiles([])
    }
    const onEditFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files || []) as File[]
        setEditingFiles((prev) => [...prev, ...picked])
        e.target.value = ""
    }
    const cancelEdit = () => {
        setEditingId(null)
        setEditingText("")
        setEditingFiles([])
    }
    const saveEdit = async (msgId: number) => {
        try {
            const payload: { text?: string; files?: File[] } = {}
            payload.text = editingText
            if (editingFiles.length > 0) payload.files = editingFiles

            const updated = await editMessageApi(msgId, payload)
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
            cancelEdit()
        } catch (err: any) {
            console.error("saveEdit:", err);
            alert("Failed to save edit: " + (err?.message || ""))
        }
    }

    // --- Delete ---
    const handleDelete = async (msgId: number) => {
        if (!window.confirm("Delete this message?")) return
        try {
            await deleteMessageApi(msgId)
            setMessages((prev) => prev.filter((m) => m.id !== msgId))
        } catch (err: any) {
            console.error("delete:", err)
            alert("Failed to delete: " + (err?.message || ""))
        }
    }

    if (!user) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a user to start chat
            </div>
        )
    }

    const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp)$/i.test(url)

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div>
                    <div className="text-lg font-semibold">{user.username}</div>
                    <div className="text-sm text-gray-400">chat with {profile?.username}</div>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="text-center text-gray-400">Loading messages...</div>
                ) : error ? (
                    <div className="text-center text-red-400">Error: {error}</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500">No messages yet. Say hi 👋</div>
                ) : (
                    messages.map((msg) => {
                        const mine = msg.sender_id === myId
                        const isEditing = editingId === msg.id

                        return (
                            <div
                                key={msg.id}
                                className={`max-w-md p-3 rounded-lg break-words flex flex-col ${mine ? "bg-blue-600 self-end text-white" : "bg-gray-700 self-start text-white"
                                    }`}
                                style={{ alignSelf: mine ? "flex-end" : "flex-start" }}
                            >
                                {/* editing input or text */}
                                {isEditing ? (
                                    <>
                                        <input
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            className="bg-gray-800 text-white rounded p-2 mb-2 w-full"
                                        />

                                        {/* show existing files (read-only note) */}
                                        {msg.files && msg.files.length > 0 && (
                                            <div className="text-sm text-gray-200 mb-2">
                                                Existing attachments will be kept unless you choose new files (choosing new files will replace ALL attachments).
                                                <ul className="mt-2 space-y-1">
                                                    {msg.files.map((f, i) => {
                                                        const url = f.startsWith("http") ? f : `${BASE_URL}${f}`
                                                        return (
                                                            <li key={i}>
                                                                <a href={url} target="_blank" rel="noreferrer" className="underline text-blue-200">
                                                                    {url.split("/").pop()}
                                                                </a>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </div>
                                        )}

                                        {/* choose files to replace attachments */}
                                        <div className="flex items-center gap-2">
                                            <input type="file" multiple onChange={onEditFilesChange} className="text-sm" />
                                            {editingFiles.length > 0 && (
                                                <div className="flex gap-2 items-center">
                                                    {editingFiles.map((f, i) => (
                                                        <div key={i} className="text-xs bg-gray-800 px-2 py-1 rounded">
                                                            {f.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {msg.text && <div>{msg.text}</div>}

                                        {msg.files?.map((f, idx) => {
                                            const url = f.startsWith("http") ? f : `${BASE_URL}${f}`
                                            return isImageUrl(url) ? (
                                                <img key={idx} src={url} alt="" className="max-w-xs rounded mt-2" />
                                            ) : (
                                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-blue-200 underline block mt-2">
                                                    {url.split("/").pop()}
                                                </a>
                                            )
                                        })}
                                    </>
                                )}

                                {/* footer: date + actions */}
                                <div className="flex justify-between items-center mt-2 text-xs text-gray-200 opacity-80">
                                    <div>{msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}</div>

                                    {mine && (
                                        <div className="flex gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={() => saveEdit(msg.id)} className="text-green-400 hover:underline">
                                                        Save
                                                    </button>
                                                    <button onClick={cancelEdit} className="text-gray-400 hover:underline">
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(msg)} className="text-yellow-400 hover:underline">
                                                        Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(msg.id)} className="text-red-400 hover:underline">
                                                        Delete
                                                    </button>
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

            {/* New message area */}
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
                    {/* Styled file input */}
                    <label
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors"
                        title="Attach files"
                    >
                        <input type="file" multiple onChange={onFileChange} className="hidden" />

                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 0 0 2.828 2.828L18 9.828V21" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01" />
                        </svg>

                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white">Attach</div>
                            <div className="text-xs text-gray-400">
                                {localFiles && localFiles.length > 0 ? `${localFiles.length} file${localFiles.length > 1 ? "s" : ""} selected` : "No file selected"}
                            </div>
                        </div>

                        <div className="ml-2 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white">Choose</div>
                    </label>

                    {/* Message input */}
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={async (e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                scrollOnNextRenderRef.current = true
                                try {
                                    await handleSend()
                                } catch (err) {
                                    scrollOnNextRenderRef.current = false
                                }
                            }
                        }}
                        className="flex-1 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none"
                    />

                    {/* Send button */}
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
