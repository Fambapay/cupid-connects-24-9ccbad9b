import { toast as sonnerToast } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastInput) => {
    if (variant === "destructive") {
      sonnerToast.error(title ?? "Erro", { description });
    } else {
      sonnerToast(title ?? "", { description });
    }
  };
  return { toast };
}

export { sonnerToast as toast };
