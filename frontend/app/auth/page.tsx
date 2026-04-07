"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import axios from "axios";

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token?: string;
    rest?: {
      id: string;
      email: string;
      name: string;
    };
  };
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const API_URL = "http://localhost:3001/api/auth";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post<AuthResponse>(`${API_URL}/login`, {
          email,
          password,
        });
        if (response.data.success) {
          localStorage.setItem("token", response.data.data.token || "");
          localStorage.setItem("user", JSON.stringify(response.data.data.rest));
          router.push("/chat");
        }
      } else {
        const response = await axios.post<AuthResponse>(`${API_URL}/signup`, {
          name,
          email,
          password,
        });

        if (response.data.success) {
          setIsLogin(true);
          setError("");
          setName("");
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="chat-background">
        <div className="floating-bubbles">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
          <div className="bubble bubble-4"></div>
          <div className="bubble bubble-5"></div>
        </div>

        <div className="banner-section">
          <div className="banner-content">
            <div className="banner-logo">
              <Image
                src="/logo.svg"
                alt="Talksy Logo"
                width={80}
                height={80}
              />
            </div>
            <h1 className="banner-title">Talksy</h1>
            <p className="banner-subtitle">Connect. Chat. Converse.</p>
          </div>

          <div className="feature-bubbles">
            <div className="feature-bubble">
              <span className="feature-icon">💬</span>
              <span>Instant Messaging</span>
            </div>
            <div className="feature-bubble">
              <span className="feature-icon">👥</span>
              <span>Group Chats</span>
            </div>
            <div className="feature-bubble">
              <span className="feature-icon">🔒</span>
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <Image
            src="/logo.svg"
            alt="Talksy"
            width={60}
            height={60}
            className="auth-logo"
          />
          <h2>{isLogin ? "Welcome Back!" : "Join Talksy"}</h2>
          <p>{isLogin ? "Sign in to continue chatting" : "Create your account"}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="switch-button"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          position: relative;
          overflow: hidden;
        }

        .chat-background {
          flex: 1;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6b8dd6 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2rem;
          overflow: hidden;
        }

        .floating-bubbles {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .bubble {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          animation: float 20s infinite ease-in-out;
        }

        .bubble-1 {
          width: 300px;
          height: 300px;
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        .bubble-2 {
          width: 200px;
          height: 200px;
          top: 50%;
          right: -50px;
          animation-delay: -5s;
        }

        .bubble-3 {
          width: 150px;
          height: 150px;
          bottom: 10%;
          left: 10%;
          animation-delay: -10s;
        }

        .bubble-4 {
          width: 100px;
          height: 100px;
          top: 20%;
          right: 20%;
          animation-delay: -15s;
        }

        .bubble-5 {
          width: 250px;
          height: 250px;
          bottom: -100px;
          right: 20%;
          animation-delay: -8s;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(30px, -30px) rotate(90deg);
          }
          50% {
            transform: translate(0, -60px) rotate(180deg);
          }
          75% {
            transform: translate(-30px, -30px) rotate(270deg);
          }
        }

        .banner-section {
          position: relative;
          z-index: 10;
          text-align: center;
          color: white;
        }

        .banner-content {
          margin-bottom: 3rem;
        }

        .banner-logo {
          display: inline-block;
          margin-bottom: 1rem;
        }

        .banner-title {
          font-size: 4rem;
          font-weight: 800;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
          letter-spacing: -2px;
        }

        .banner-subtitle {
          font-size: 1.5rem;
          margin: 0.5rem 0 0;
          opacity: 0.9;
        }

        .feature-bubbles {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .feature-bubble {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          padding: 1rem 1.5rem;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 500;
          transition: transform 0.3s, background 0.3s;
        }

        .feature-bubble:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.3);
        }

        .feature-icon {
          font-size: 1.2rem;
        }

        .auth-card {
          width: 100%;
          max-width: 480px;
          background: white;
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: -10px 0 40px rgba(0, 0, 0, 0.1);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-logo {
          margin-bottom: 1rem;
        }

        .auth-header h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0 0 0.5rem;
        }

        .auth-header p {
          color: #666;
          margin: 0;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #333;
        }

        .form-group input {
          padding: 0.875rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }

        .form-group input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .form-group input::placeholder {
          color: #9ca3af;
        }

        .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          text-align: center;
        }

        .auth-button {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          padding: 1rem;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 0.5rem;
        }

        .auth-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
        }

        .auth-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          color: #666;
        }

        .auth-footer p {
          margin: 0;
        }

        .switch-button {
          background: none;
          border: none;
          color: #6366f1;
          font-weight: 600;
          cursor: pointer;
          font-size: inherit;
          padding: 0;
          margin-left: 0.25rem;
          transition: color 0.2s;
        }

        .switch-button:hover {
          color: #8b5cf6;
        }

        @media (max-width: 900px) {
          .auth-container {
            flex-direction: column;
          }

          .chat-background {
            padding: 2rem;
            min-height: 200px;
          }

          .banner-title {
            font-size: 2.5rem;
          }

          .feature-bubbles {
            display: none;
          }

          .auth-card {
            max-width: none;
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </div>
  );
}