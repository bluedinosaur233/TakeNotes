import { redirect } from "next/navigation";
import { authConfig } from "@/lib/auth/config";
import { getAdmin } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "登录", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/notes");
  const configured = Boolean(authConfig());
  return <main className="auth-page">
    <p className="ask-eyebrow">PRIVATE WORKSPACE</p>
    <h1>回到你的知识库</h1>
    <p className="ask-muted">此实例为私人空间，请使用部署时设置的管理员账号登录。</p>
    {configured ? <LoginForm /> : <div className="ask-notice">
      管理员配置尚未完成。请在服务器终端运行 <code>pnpm setup:admin</code>，或按部署文档填写管理员密码哈希、会话密钥与 APP_URL，然后重启服务。
    </div>}
  </main>;
}
