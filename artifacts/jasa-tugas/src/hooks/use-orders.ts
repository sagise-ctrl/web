import { useQuery, useMutation } from "@tanstack/react-query";

export type OrderStatus = "pending" | "proses" | "selesai";

export interface Order {
  order_id: string;
  nama: string;
  wa: string;
  jenis: "Makalah" | "PPT" | "Artikel";
  halaman: number;
  deadline: string;
  note: string;
  status: OrderStatus;
}

const GAS_URL = import.meta.env.VITE_GAS_URL;

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (data: Omit<Order, "order_id" | "status">) => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "createOrder", data })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal membuat order");
      return json as { success: true; order_id: string };
    }
  });
}

export function useGetOrder(orderId: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(`${GAS_URL}?action=getOrder&order_id=${orderId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Order tidak ditemukan");
      return json.data as Order;
    },
    enabled: !!orderId
  });
}

export function useGetAllOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(`${GAS_URL}?action=getAllOrders`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal mengambil daftar order");
      return json.data as Order[];
    }
  });
}

export function useUpdateOrder() {
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "updateStatus", order_id: orderId, status })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal update status");
      return json;
    }
  });
}
