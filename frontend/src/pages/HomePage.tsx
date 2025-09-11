// src/pages/HomePage.tsx
import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import UserList from "../components/UserList"
import ChatWindow from "../components/ChatWindow"
import type { User } from "../api/users"

const HomePage: React.FC = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    const handleLogout = async () => {
        await logout()
        navigate("/auth")
    }

    if (!user) return <p className="text-white text-center mt-10">Loading...</p>

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <div className="flex justify-between items-center bg-gray-800 px-6 py-4 shadow-md">
                <h1 className="text-2xl font-bold">Messenger</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold"
                >
                    Logout
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <UserList onSelectUser={setSelectedUser} selectedUser={selectedUser} />
                {selectedUser ? (
                    <ChatWindow user={selectedUser} profile={user} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a user to start chat
                    </div>
                )}
            </div>
        </div>
    )
}

export default HomePage
