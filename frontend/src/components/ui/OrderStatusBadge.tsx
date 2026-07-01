import type { OrderStatus } from "@/types/order";

const CONFIG: Record<OrderStatus, { label: string; classes: string }> = {
  placed:           { label: "Order Placed",    classes: "bg-blue-50 text-blue-600"       },
  accepted:         { label: "Accepted",        classes: "bg-indigo-50 text-indigo-600"   },
  rejected:         { label: "Rejected",        classes: "bg-red-50 text-red-500"         },
  preparing:        { label: "Preparing",       classes: "bg-amber-50 text-amber-600"     },
  ready_for_pickup: { label: "Ready for Pickup",classes: "bg-yellow-50 text-yellow-700"   },
  picked_up:        { label: "Picked Up",       classes: "bg-purple-50 text-purple-600"   },
  out_for_delivery: { label: "On the Way",      classes: "bg-[#fff3ef] text-[#ff6b35]"   },
  delivered:        { label: "Delivered",       classes: "bg-green-50 text-green-600"     },
  cancelled:        { label: "Cancelled",       classes: "bg-gray-100 text-gray-500"      },
};

interface Props {
  status: OrderStatus;
  size?: "sm" | "md";
}

export default function OrderStatusBadge({ status, size = "md" }: Props) {
  const cfg = CONFIG[status] ?? CONFIG.placed;
  return (
    <span
      className={`font-semibold rounded-full ${cfg.classes} ${
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"
      }`}
    >
      {cfg.label}
    </span>
  );
}
