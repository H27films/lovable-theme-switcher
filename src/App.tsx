import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingSimple from "./pages/LandingSimple";
import SubLandingSimple from "./pages/SubLandingSimple";
import OfficeSimple from "./pages/OfficeSimple";
import OrderSimple from "./pages/OrderSimple";
import SearchSimple from "./pages/SearchSimple";
import BoudoirSimpleNew from "./pages/BoudoirSimpleNew";
import ChicSimpleNew from "./pages/ChicSimpleNew";
import NurYadiSimpleNew from "./pages/NurYadiSimpleNew";
import TabletScaler from "./components/TabletScaler";
import SafeAreaTop from "./components/SafeAreaTop";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SafeAreaTop><LandingSimple /></SafeAreaTop>} />
          {/* ── Simple / Boss routes (all wrapped in TabletScaler + SafeAreaTop for iOS notch / status bar) ── */}
          <Route path="/simple" element={<SafeAreaTop><LandingSimple /></SafeAreaTop>} />
          <Route path="/simple/office" element={<SafeAreaTop><TabletScaler><SubLandingSimple /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/boudoir" element={<SafeAreaTop><TabletScaler><BoudoirSimpleNew /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/chic" element={<SafeAreaTop><TabletScaler><ChicSimpleNew /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/nuryadi" element={<SafeAreaTop><TabletScaler><NurYadiSimpleNew /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/branch-office" element={<SafeAreaTop><TabletScaler><OfficeSimple /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/order" element={<SafeAreaTop><TabletScaler><OrderSimple /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/search" element={<SafeAreaTop><TabletScaler><SearchSimple /></TabletScaler></SafeAreaTop>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
