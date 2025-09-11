// src/components/ProtectedRoute.tsx
import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
    const { user, loading } = useAuth()

    if (loading) return <p className="text-white text-center mt-10">Loading...</p> // пока идёт fetchProfile
    if (!user) return <Navigate to="/auth" replace /> // если нет авторизации

    return children
}

export default ProtectedRoute
