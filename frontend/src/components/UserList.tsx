import { useEffect, useState } from "react"
import { fetchUsers } from "../api/users"

interface User {
    id: number
    username: string
    email: string
}

interface UserListProps {
    onSelectUser: (user: User) => void
    selectedUser: User | null
}

export default function UserList({ onSelectUser, selectedUser }: UserListProps) {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchUsers()
            .then((data: User[]) => {
                // console.log("users:", data)
                setUsers(data)
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="p-4 text-gray-400">Loading users...</div>

    return (
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
            <h2 className="text-xl font-bold p-4 border-b border-gray-700">Friends</h2>
            {users.map(user => (
                <div
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    className={`p-4 cursor-pointer hover:bg-gray-700 ${selectedUser?.id === user.id ? "bg-gray-700" : ""
                        }`}
                >
                    {user.username}
                </div>
            ))}
        </div>
    )
}
