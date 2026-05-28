export type TourPlacement = "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  /** Optional route the user must be on for this step. If different from the current route, the overlay navigates. */
  route?: string;
  /** Value of the `data-tour-anchor` attribute on the target element. */
  anchorId: string;
  title: string;
  body: string;
  placement: TourPlacement;
}
