import type { Message } from "../types/types";

export const useSendMessage = () => sendMessage;

export const useGetMessage = () => getMessage;

const PI_URL = (import.meta.env.VITE_PI_URL as string | undefined) ?? "";

const sendMessage = async (message: Message, bearer: string) => {
  const response = await fetch(PI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const fallbackMessage = `Request failed with status ${response.status}`;
    throw new Error(errorText || fallbackMessage);
  }
};

const getMessage = async (bearer: string): Promise<Message> => {
  const response = await fetch(PI_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${bearer}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    const fallbackMessage = `Request failed with status ${response.status}`;
    throw new Error(errorText || fallbackMessage);
  }

  return response.json() as Promise<Message>;
};
