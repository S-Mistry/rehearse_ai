import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/types/rehearse";

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };

  return NextResponse.json(body, { status });
}

export async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as Partial<ApiErrorResponse> & {
      message?: string;
    };

    if (payload.error?.message) {
      return payload.error.message;
    }

    if (payload.message) {
      return payload.message;
    }
  } catch {
    // Fall through to raw text parsing.
  }

  try {
    return (await response.text()).trim();
  } catch {
    return "";
  }
}
