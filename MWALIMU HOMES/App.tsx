import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PaymentImport from "./pages/PaymentImport";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Tenants from "./pages/Tenants";
import Leases from "./pages/Leases";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import GlobalOverview from "./pages/GlobalOverview";
import InvoiceReview from "./pages/InvoiceReview";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/payment-import"} component={PaymentImport} />
      <Route path={"/properties"} component={Properties} />
      <Route path={"/properties/:id"} component={PropertyDetail} />
      <Route path={"/tenants"} component={Tenants} />
      <Route path={"/leases"} component={Leases} />
      <Route path={"/invoices"} component={Invoices} />
      <Route path={"/payments"} component={Payments} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/global-overview"} component={GlobalOverview} />
      <Route path={"/invoice-review"} component={InvoiceReview} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
