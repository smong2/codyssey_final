export const number = (value: number | undefined | null) =>
  typeof value === "number" ? new Intl.NumberFormat("ko-KR").format(value) : "—";

export const percent = (value: number | undefined | null) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "—";

export const dateTime = (value: string | null | undefined) => {
  if (!value) return "기록 없음";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(parsed);
};

export const todayKst = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
