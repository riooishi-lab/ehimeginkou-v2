import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[ErrorBoundary]", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md px-6">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                        <h1 className="text-xl font-bold text-gray-800">
                            {this.props.fallbackMessage || "エラーが発生しました"}
                        </h1>
                        <p className="text-sm text-gray-500">
                            問題が解決しない場合は、管理者にお問い合わせください。
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0079B3] text-white rounded-lg hover:bg-[#005a86] transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            ページを再読み込み
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
