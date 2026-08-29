export default function ProtectedRouteLoading() {
  return (
    <div className="routeLoading" role="status" aria-live="polite">
      <span className="routeLoadingBar" aria-hidden="true" />
      <span>Loading current information…</span>
    </div>
  );
}
