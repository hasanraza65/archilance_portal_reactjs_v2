import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "react-quill/dist/quill.snow.css";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "@/auth/AuthContext";
import { UIProvider } from "@/store/UIContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Served from /v2/ alongside the classic app, so the router needs the same
        prefix Vite builds against - otherwise every in-app link would drop the
        /v2 segment and land on the classic app. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <QueryClientProvider client={queryClient}>
        <UIProvider>
          <AuthProvider>
            <App />
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                style: { borderRadius: "12px", fontSize: "13.5px" },
              }}
            />
          </AuthProvider>
        </UIProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
