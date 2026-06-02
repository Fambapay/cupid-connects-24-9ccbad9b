import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-center"
      className="toaster group"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "hunie-toast",
          title: "hunie-toast__title",
          description: "hunie-toast__desc",
          actionButton: "hunie-toast__action",
          cancelButton: "hunie-toast__cancel",
          closeButton: "hunie-toast__close",
          icon: "hunie-toast__icon",
          success: "hunie-toast--success",
          error: "hunie-toast--error",
          info: "hunie-toast--info",
          warning: "hunie-toast--warning",
          loading: "hunie-toast--loading",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
