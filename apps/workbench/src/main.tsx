import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FetchFhirClient, FhirClientProvider } from "@fhir-place/react-fhir";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.js";
import { FHIR_BASE_URL, ROUTER_BASENAME } from "./config.js";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const fhirClient = new FetchFhirClient({ baseUrl: FHIR_BASE_URL });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FhirClientProvider client={fhirClient}>
        <BrowserRouter basename={ROUTER_BASENAME}>
          <App />
        </BrowserRouter>
      </FhirClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
