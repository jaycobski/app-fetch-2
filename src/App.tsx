import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "./pages/Auth";
import Index from "./pages/Index";
import EmbedsPage from "./pages/Embeds";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<Index />} />
            <Route path="/embeds" element={<EmbedsPage />} />
          </Routes>
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;