import React, { createContext, useContext, useState, useEffect } from "react"
import { login as apiLogin, logout as apiLogout, fetchProfile, UserProfile, LoginParams } from "../api/auth"

interface AuthContextType {
    user: UserProfile | null | undefined
    loading: boolean
    login: (params: LoginParams) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null | undefined>(undefined)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProfile()
            .then((data) => setUser(data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false))
    }, [])

    const login = async ({ username, password }: LoginParams) => {
        await apiLogin({ username, password })
        const profile = await fetchProfile()
        setUser(profile) 
    }

    const logout = async () => {
        await apiLogout()
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error("useAuth must be used within AuthProvider")
    return context
}
