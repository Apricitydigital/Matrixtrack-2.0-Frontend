export default function AccessDeniedState({ message = "You do not have permission to access this resource." }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
      <h2 className="text-lg font-semibold text-rose-700">Access Denied</h2>
      <p className="mt-2 text-sm text-rose-600">{message}</p>
    </div>
  );
}