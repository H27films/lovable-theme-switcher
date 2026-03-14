import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import LandingSimple from "./pages/LandingSimple";
import Index from "./pages/Index";
import Stock from "./pages/Stock";
import StockPhone from "./pages/StockPhone";
import StockNurYadi from "./pages/StockNurYadi";
import StockChicNailspa from "./pages/StockChicNailspa";
import StockChicNailspaPhone from "./pages/StockChicNailspaPhone";
import StockNurYadiPhone from "./pages/StockNurYadiPhone";
import IndexPhone from "./pages/IndexPhone";
import IndexPhoneSimple from "./pages/IndexPhoneSimple";
import BranchBoudoirSimple from "./pages/BranchBoudoirSimple";
import BranchChicSimple from "./pages/BranchChicSimple";
import BranchNurYadiSimple from "./pages/BranchNurYadiSimple";
import BranchOfficeSimple from "./pages/BranchOfficeSimple";
import OrderPage from "./pages/OrderPage";
import SearchPage from "./pages/SearchPage";
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
          <Route path="/prices" element={<Index />} />
          <Route path="/office/mobile" element={<IndexPhone />} />
          {/* ── Simple / Boss routes ── */}
          <Route path="/simple" element={<LandingSimple />} />
          <Route path="/simple/office" element={<IndexPhoneSimple />} />
          <Route path="/simple/boudoir" element={<BranchBoudoirSimple />} />
          <Route path="/simple/chic" element={<BranchChicSimple />} />
          <Route path="/simple/nuryadi" element={<BranchNurYadiSimple />} />
          <Route path="/simple/branch-office" element={<BranchOfficeSimple />} />
          <Route path="/simple/order" element={<OrderPage />} />
          <Route path="/simple/search" element={<SearchPage />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/stock/mobile" element={<StockPhone />} />
          <Route path="/stocknuryadi" element={<StockNurYadi />} />
          <Route path="/stocknuryadi/mobile" element={<StockNurYadiPhone />} />
          <Route path="/stockchicnailspa" element={<StockChicNailspa />} />
          <Route path="/stockchicnailspa/mobile" element={<StockChicNailspaPhone />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
