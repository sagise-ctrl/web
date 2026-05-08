import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LockKeyhole, RefreshCw, Loader2 } from "lucide-react";
import { useGetAllOrders, useUpdateOrder, OrderStatus } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      setIsAuthenticated(true);
    } else {
      alert("Password salah");
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <LockKeyhole className="w-6 h-6 text-slate-600" />
              </div>
              <CardTitle>Admin Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <Input 
                  type="password" 
                  placeholder="Masukkan password..." 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" className="w-full">Masuk</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const { toast } = useToast();
  const { data: orders = [], isLoading, refetch, isFetching } = useGetAllOrders();
  const updateOrder = useUpdateOrder();

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrder.mutateAsync({ orderId, status: newStatus });
      toast({
        title: "Status diperbarui",
        description: `Order ${orderId} diubah menjadi ${newStatus}`,
      });
      refetch();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal update",
        description: error.message,
      });
    }
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const prosesCount = orders.filter(o => o.status === "proses").length;
  const selesaiCount = orders.filter(o => o.status === "selesai").length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <Button onClick={() => refetch()} variant="outline" disabled={isFetching} className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-slate-500 mb-1">Total Order</p>
              <p className="text-3xl font-bold">{orders.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-yellow-700 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-800">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-blue-700 mb-1">Diproses</p>
              <p className="text-3xl font-bold text-blue-800">{prosesCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-green-700 mb-1">Selesai</p>
              <p className="text-3xl font-bold text-green-800">{selesaiCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 flex justify-center items-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mr-2" /> Memuat data...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                Belum ada pesanan masuk.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Nama & WA</TableHead>
                      <TableHead>Tugas</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell className="font-medium whitespace-nowrap">{order.order_id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{order.nama}</div>
                          <div className="text-sm text-slate-500">{order.wa}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="mb-1">{order.jenis}</Badge>
                          <div className="text-sm text-slate-500">{order.halaman} Hal/Slide</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {new Date(order.deadline).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={order.note}>
                          {order.note || "-"}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={order.status} 
                            onValueChange={(val: OrderStatus) => handleStatusChange(order.order_id, val)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="proses">Proses</SelectItem>
                              <SelectItem value="selesai">Selesai</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}