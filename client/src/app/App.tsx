import { Send, Trash2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background text-foreground p-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Enterprise UI Foundation</h1>
        <p className="text-muted-foreground">React 19 + Tailwind v4 + Bleeding Edge Headless</p>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-center p-6 border rounded-lg shadow-sm">
        <Button>Standard Action</Button>

        <Button variant="secondary">
          <Send />
          Send Order
        </Button>

        <Button variant="destructive">
          Cancel Draft
          <Trash2 />
        </Button>

        <Button variant="ghost">Ghost Button</Button>
      </div>
    </div>
  );
}

export default App;
