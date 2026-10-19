import type { User } from "firebase/auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export async function adminRequest<T>(user: User, path: string, init: RequestInit = {}): Promise<T> {
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    throw new Error("관리자 API 주소가 설정되지 않았습니다. NEXT_PUBLIC_API_BASE_URL을 확인하세요.");
  }
  const token = await user.getIdToken();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error("API에 연결할 수 없습니다. Render 상태와 CORS_ORIGINS를 확인하세요.");
  }
  if (!response.ok) {
    let detail = "요청을 처리하지 못했습니다.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      // The server may return a non-JSON error page.
    }
    throw new ApiError(response.status, detail);
  }
  return response.json() as Promise<T>;
}
