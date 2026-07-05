import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ExperimentProvider } from "./contexts/ExperimentContext";
import Home from "./pages/Home";
import Experiment from "./pages/Experiment";
import Result from "./pages/Result";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";

function MainExperiment() {
  return <Experiment />;
}

function Practice() {
  return <Experiment runType="practice" />;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/practice" component={Practice} />
      <Route path="/experiment" component={MainExperiment} />
      <Route path="/result" component={Result} />
      <Route path="/settings" component={Settings} />
      <Route path="/logs" component={Logs} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <ExperimentProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ExperimentProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
