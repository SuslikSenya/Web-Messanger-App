// src/pages/AuthPage.tsx
import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from '../context/AuthContext'
import { register } from "../api/auth";


export default function AuthPage(): JSX.Element {
    const navigate = useNavigate()

    const [isLogin, setIsLogin] = useState<boolean>(true)
    const [username, setUsername] = useState<string>("")
    const [email, setEmail] = useState<string>("")
    const [password, setPassword] = useState<string>("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)

    const { login } = useAuth()

    useEffect(() => {
        const token = localStorage.getItem("access_token")
        if (token) {
            navigate("/home")
        }
    }, [])

    const toggleMode = () => {
        setIsLogin((v) => !v)
        setError(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await login({ username, password });
                navigate("/home");
            } else {
                await register({ username, email, password });
                alert("Registration successful! Please login.");
                setIsLogin(true);
            }
        } catch (err) {
            alert("Operation failed");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 p-10 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-extrabold text-center mb-6">
                    {isLogin ? "Welcome Back" : "Create Account"}
                </h2>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">Username</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {isLogin && (
                        <div>
                            <label className="block text-sm font-medium mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-xl bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-lg ${isLogin ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
                            }`}
                    >
                        {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
                    </button>
                </form>

                <p className="text-center text-sm mt-6 text-gray-300">
                    {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
                    <span className="text-blue-400 cursor-pointer hover:underline" onClick={toggleMode}>
                        {isLogin ? "Register" : "Login"}
                    </span>
                </p>
            </div>
        </div>
    )
}
