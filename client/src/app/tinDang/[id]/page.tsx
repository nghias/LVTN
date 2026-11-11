// src/app/tinDang/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import ChiTietTinDangClient from "@/components/home/ChiTietTinDangClient";

export default function TinDangDetailPage() {
  const params = useParams<{ id: string }>();
  const maTin = Number(params?.id);

  return <ChiTietTinDangClient maTin={maTin} />;
}