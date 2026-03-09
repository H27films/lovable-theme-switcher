import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Landing2 from "./pages/Landing2";
import Index from "./pages/Index";
import Stock from "./pages/Stock";
import StockNurYadi from "./pages/StockNurYadi";
import StockChicNailspa from "./pages/StockChicNailspa";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing2" element={<Landing2 />} />
          <Route path="/prices" element={<Index />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/stocknuryadi" element={<StockNurYadi />} />
          <Route path="/stockchicnailspa" element={<StockChicNailspa />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
