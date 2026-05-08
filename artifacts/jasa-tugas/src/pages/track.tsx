import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, Calendar, Clock, BookOpen, User } from "lucide-react";
import { useGetOrder, Order } from "@/hooks/use-orders";

function StatusBadge({ status }: { status: Order["status"] }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-sm px-3 py-1">Menunggu Review</Badge>;
    case "proses":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-sm px-3 py-1">Sedang Dikerjakan</Badge>;
    case "selesai":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-sm px-3 py-1">Selesai</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function TrackPage() {
  const [searchId, setSearchId] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setSearchId(id);
      setSubmittedId(id);
    }
  }, []);

  const { data: order, isLoading, isError, error, isSuccess } = useGetOrder(submittedId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      setSubmittedId(searchId.trim());
      // Update URL without reload
      const url = new URL(window.location.href);
      url.searchParams.set('id', searchId.trim());
      window.history.pushState({}, '', url.toString());
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-10 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Lacak Status Pesanan</h1>
          <p className="text-slate-500">Masukkan Order ID Anda untuk melihat perkembangan tugas.</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input 
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Contoh: ORD-1234567890" 
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button type="submit" className="h-12 px-6" disabled={!searchId.trim() || isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Cari"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isError && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-8 text-center text-red-800">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
              <h3 className="font-semibold text-lg mb-1">Order Tidak Ditemukan</h3>
              <p className="text-red-600">{(error as Error).message || "Silakan periksa kembali Order ID Anda."}</p>
            </CardContent>
          </Card>
        )}

        {isSuccess && order && (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">ORDER ID</p>
                <p className="text-xl font-bold tracking-tight text-slate-900">{order.order_id}</p>
              </div>
              <div className="flex flex-col sm:items-end">
                <p className="text-sm font-medium text-slate-500 mb-1">STATUS</p>
                <StatusBadge status={order.status} />
              </div>
            </div>
            <CardContent className="p-0">
              <dl className="divide-y divide-slate-100">
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <User className="w-4 h-4" /> Pemesan
                  </dt>
                  <dd className="text-sm text-slate-900 sm:col-span-2 font-medium">{order.nama}</dd>
                </div>
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Jenis Tugas
                  </dt>
                  <dd className="text-sm text-slate-900 sm:col-span-2">{order.jenis}</dd>
                </div>
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Halaman / Slide
                  </dt>
                  <dd className="text-sm text-slate-900 sm:col-span-2">{order.halaman}</dd>
                </div>
                <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Deadline
                  </dt>
                  <dd className="text-sm text-slate-900 sm:col-span-2">{new Date(order.deadline).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</dd>
                </div>
                {order.note && (
                  <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Catatan
                    </dt>
                    <dd className="text-sm text-slate-900 sm:col-span-2 whitespace-pre-wrap">{order.note}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

import { AlertCircle } from "lucide-react";