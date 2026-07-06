import { Provider, Root, Trigger, Content, Portal } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <Provider delayDuration={250}>{children}</Provider>;
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  return (
    <Root>
      <Trigger asChild>{children}</Trigger>
      <Portal>
        <Content
          side={side}
          sideOffset={6}
          className={cn(
            "glass-overlay z-50 max-w-xs rounded-md px-2.5 py-1.5",
            "text-xs text-text-primary",
            "data-[state=delayed-open]:animate-in data-[state=closed]:animate-out",
          )}
        >
          {content}
        </Content>
      </Portal>
    </Root>
  );
}
