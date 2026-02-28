export default function Button({
  children,
  variant = "primary",
  ...props
}) {
  const base =
    "px-4 py-2 rounded-lg font-medium transition active:scale-95";

  const styles = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700",
    secondary:
      "bg-slate-200 text-slate-800 hover:bg-slate-300",
    danger:
      "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button className={`${base} ${styles[variant]}`} {...props}>
      {children}
    </button>
  );
}
