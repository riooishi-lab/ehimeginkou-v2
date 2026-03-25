import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { BarChart3, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

export function Login() {
    const { signIn } = useAuth()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        const { error } = await signIn(email, password)
        if (error) {
            setError("メールアドレスまたはパスワードが正しくありません")
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <BarChart3 className="h-12 w-12 text-[#0079B3]" />
                    </div>
                    <CardTitle className="text-2xl text-[#0079B3]">採用動画管理</CardTitle>
                    <CardDescription>管理者としてログインしてください</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-[#0079B3] hover:bg-[#005a86]"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            ログイン
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
