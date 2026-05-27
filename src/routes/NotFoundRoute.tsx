import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function NotFoundRoute() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The route you tried to open doesn't exist in this phase."
      action={
        <Button asChild variant="primary" size="md">
          <Link to="/">Back to Welcome</Link>
        </Button>
      }
    />
  );
}
