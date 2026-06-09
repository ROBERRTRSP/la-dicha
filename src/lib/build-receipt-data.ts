import type { ReceiptData } from "@/lib/ticket-receipt";
import type { Ticket, TicketItem, Draw, User } from "@prisma/client";

type TicketWithItems = Ticket & {
  items: (TicketItem & { draw: Draw })[];
};

export function buildReceiptData(
  ticket: TicketWithItems,
  user?: Pick<User, "fullName" | "username">
): ReceiptData {
  return {
    ticketNumber: ticket.ticketNumber,
    verificationCode: ticket.verificationCode,
    createdAt: ticket.createdAt.toISOString(),
    totalAmount: ticket.totalAmount,
    balanceBefore: ticket.balanceBefore,
    balanceAfter: ticket.balanceAfter,
    status:
      ticket.status === "CANCELED"
        ? "CANCELLED"
        : ticket.status === "ACTIVE"
          ? "ACTIVE"
          : ticket.status === "WINNER"
            ? "ACTIVE"
            : ticket.status === "PAID"
              ? "COPY"
              : "COPY",
    playerName: user?.fullName ?? user?.username,
    items: ticket.items.map((item) => ({
      betType: item.betType,
      numbers: item.numbers,
      amount: item.amount,
      lotteryName: item.lotteryName,
      drawTime: item.draw.drawTime,
      drawDate: item.draw.drawDate.toISOString(),
      superPaleName: item.superPaleName,
    })),
  };
}
