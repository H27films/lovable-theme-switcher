import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import SubLanding from "./pages/SubLanding";
import BranchesPage from "./pages/BranchesPage";
import Office from "./pages/Office";
import Order from "./pages/Order";
import Search from "./pages/Search";
import Boudoir from "./pages/Boudoir";
import Chic from "./pages/Chic";
import NurYadi from "./pages/NurYadi";
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
          <Route path="/" element={<SafeAreaTop><Landing /></SafeAreaTop>} />
          {/* ── Simple / Boss routes (all wrapped in TabletScaler + SafeAreaTop for iOS notch / status bar) ── */}
          <Route path="/simple" element={<SafeAreaTop><Landing /></SafeAreaTop>} />
          <Route path="/simple/branches" element={<SafeAreaTop><TabletScaler><BranchesPage /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/branches/admin" element={<SafeAreaTop><TabletScaler><SubLanding /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/boudoir" element={<SafeAreaTop><TabletScaler><Boudoir /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/chic" element={<SafeAreaTop><TabletScaler><Chic /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/nuryadi" element={<SafeAreaTop><TabletScaler><NurYadi /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/office" element={<SafeAreaTop><TabletScaler><Office /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/order" element={<SafeAreaTop><TabletScaler><Order /></TabletScaler></SafeAreaTop>} />
          <Route path="/simple/search" element={<SafeAreaTop><TabletScaler><Search /></TabletScaler></SafeAreaTop>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
