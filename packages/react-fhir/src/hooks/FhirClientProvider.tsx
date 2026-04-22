import { createContext, useContext, type ReactNode } from "react";
import type { FhirClient } from "../client/types.js";

const FhirClientContext = createContext<FhirClient | null>(null);

export interface FhirClientProviderProps {
  client: FhirClient;
  children: ReactNode;
}

export function FhirClientProvider({ client, children }: FhirClientProviderProps) {
  return (
    <FhirClientContext.Provider value={client}>{children}</FhirClientContext.Provider>
  );
}

export function useFhirClient(): FhirClient {
  const client = useContext(FhirClientContext);
  if (!client) {
    throw new Error(
      "useFhirClient must be called inside <FhirClientProvider>. Wrap your app or tests with it.",
    );
  }
  return client;
}
