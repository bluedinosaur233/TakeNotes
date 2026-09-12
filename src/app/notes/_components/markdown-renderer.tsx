import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// 使用解析器提供的原文位置：重复标题也有不同 ID，代码块里的 # 不会成为标题。
const heading: Components["h1"] = ({ node, children }) => {
  const Tag = (node?.tagName ?? "h2") as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return <Tag id={`note-heading-${node?.position?.start.offset}`} tabIndex={-1}>{children}</Tag>;
};

const components: Components = {
  h1: heading, h2: heading, h3: heading, h4: heading, h5: heading, h6: heading,
  pre: ({ node, children }) => {
    const code = node?.children.find((child) => child.type === "element" && child.tagName === "code");
    const classes: unknown = code?.type === "element" ? code.properties.className : undefined;
    const classNames = Array.isArray(classes)
      ? classes
      : typeof classes === "string"
        ? classes.split(/\s+/)
        : [];
    const language = classNames.find(
      (value) => typeof value === "string" && value.startsWith("language-"),
    );
    const label = typeof language === "string" ? language.slice("language-".length) : "纯文本";
    return (
      <div className="code-block">
        <div className="code-language">{label}</div>
        <pre>{children}</pre>
      </div>
    );
  },
};

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
