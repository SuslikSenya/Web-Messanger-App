// src/pages/NotFound.tsx
import React from "react"
import { Link } from "react-router-dom"

const NotFound: React.FC = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404 - Page not found</h1>
                <p className="mb-4">The page you are looking for doesn't exist.</p>
                <Link to="/auth" className="text-blue-400 underline">
                    Go to auth
                </Link>
            </div>
        </div>
    )
}

export default NotFound
