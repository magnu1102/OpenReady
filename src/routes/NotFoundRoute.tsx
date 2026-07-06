import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { NotFoundIllustration } from "@/components/ui/illustrations";
import { copy } from "@/lib/copy";

export function NotFoundRoute() {
  return (
    <EmptyState
      icon={Compass}
      illustration={<NotFoundIllustration />}
      title={copy.notFound.title}
      description={copy.notFound.description}
      action={
        <Button asChild variant="primary" size="md">
          <Link to="/">{copy.notFound.action}</Link>
        </Button>
      }
    />
  );
}
