import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import LandingSimple from "./pages/LandingSimple";
import Office from "./pages/Office";
import Boudoir from "./pages/Boudoir";
import BoudoirPhone from "./pages/BoudoirPhone";
import NurYadi from "./pages/NurYadi";
import Chic from "./pages/Chic";
import ChicPhone from "./pages/ChicPhone";
import NurYadiPhone from "./pages/NurYadiPhone";
import OfficePhone from "./pages/OfficePhone";
import SubLandingSimple from "./pages/SubLandingSimple";
import BoudoirSimple from "./pages/BoudoirSimple";
import ChicSimple from "./pages/ChicSimple";
import NurYadiSimple from "./pages/NurYadiSimple";
import OfficeSimple from "./pages/OfficeSimple";
import OrderSimple from "./pages/OrderSimple";
import SearchSimple from "./pages/SearchSimple";
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
          <Route path="/prices" element={<Office />} />
          <Route path="/office/mobile" element={<OfficePhone />} />
          {/* ── Simple / Boss routes ── */}
          <Route path="/simple" element={<LandingSimple />} />
          <Route path="/simple/office" element={<SubLandingSimple />} />
          <Route path="/simple/boudoir" element={<BoudoirSimple />} />
          <Route path="/simple/chic" element={<ChicSimple />} />
          <Route path="/simple/nuryadi" element={<NurYadiSimple />} />
          <Route path="/simple/branch-office" element={<OfficeSimple />} />
          <Route path="/simple/order" element={<OrderSimple />} />
          <Route path="/simple/search" element={<SearchSimple />} />
          <Route path="/stock" element={<Boudoir />} />
          <Route path="/stock/mobile" element={<BoudoirPhone />} />
          <Route path="/stocknuryadi" element={<NurYadi />} />
          <Route path="/stocknuryadi/mobile" element={<NurYadiPhone />} />
          <Route path="/stockchicnailspa" element={<Chic />} />
          <Route path="/stockchicnailspa/mobile" element={<ChicPhone />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
