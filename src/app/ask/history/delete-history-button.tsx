"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteHistory } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="ask-secondary" type="submit" disabled={pending}>{pending ? "删除中…" : "确认删除记录"}</button>;
}
export function DeleteHistoryButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  return confirming ? <form action={deleteHistory} className="history-delete">
    <p className="ask-muted">删除此问答和来源快照？不会删除原笔记；已有本地草稿请在问答页另行清空。</p>
    <input type="hidden" name="id" value={id} /><Submit />
    <button type="button" className="ask-secondary" onClick={() => setConfirming(false)}>取消</button>
  </form> : <button className="ask-secondary" type="button" onClick={() => setConfirming(true)}>删除这条记录</button>;
}
